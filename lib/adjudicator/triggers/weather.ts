/**
 * Weather-based trigger detection: heat, rain, AQI.
 * Uses Open-Meteo (and optionally Tomorrow.io, WAQI) with retry and cache.
 */

import { EXTERNAL_APIS } from '@/lib/config/constants';
import { triggersFromContext } from '@/lib/adjudicator/rule-context';
import { probeSource } from '@/lib/adjudicator/instrumentation';
import { mergeSourceHealth } from '@/lib/adjudicator/ledger';
import type {
  AdjudicatorInstrumentationContext,
  TriggerCandidate,
} from '@/lib/adjudicator/types';
import { fetchWithRetry } from '@/lib/utils/retry';
import { toDateString } from '@/lib/utils/date';

export async function fetchCurrentAqi(
  lat: number,
  lng: number,
  waqiKey: string | undefined,
  ctx?: AdjudicatorInstrumentationContext,
): Promise<number> {
  if (waqiKey) {
    const t0 = Date.now();
    const observedAt = new Date().toISOString();
    try {
      const data = await fetchWithRetry<{
        status?: string;
        data?: { aqi?: number | string };
      }>(
        `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${waqiKey}`,
        undefined,
        { cacheTtlMs: EXTERNAL_APIS.CACHE_AQI_TTL_MS },
      );
      if (data.status === 'ok' && data.data?.aqi != null) {
        const aqi = Number(data.data.aqi);
        if (!isNaN(aqi) && aqi >= 0) {
          if (ctx) {
            await mergeSourceHealth(ctx.supabase, 'waqi_ground_station', {
              ok: true,
              latencyMs: Date.now() - t0,
              observedAt,
            });
          }
          return aqi;
        }
      }
      if (ctx) {
        await mergeSourceHealth(ctx.supabase, 'waqi_ground_station', {
          ok: false,
          latencyMs: Date.now() - t0,
          observedAt,
          errorDetail: 'no_valid_aqi',
        });
      }
    } catch (err) {
      if (ctx) {
        await mergeSourceHealth(ctx.supabase, 'waqi_ground_station', {
          ok: false,
          latencyMs: Date.now() - t0,
          observedAt,
          errorDetail: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  try {
    const data = await probeSource(
      ctx,
      'openmeteo_aqi_current',
      () =>
        fetchWithRetry<{
          current?: { us_aqi?: number | null };
          hourly?: { us_aqi?: (number | null)[] };
        }>(
          `https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi&hourly=us_aqi`,
          undefined,
          { cacheTtlMs: EXTERNAL_APIS.CACHE_AQI_TTL_MS },
        ),
      waqiKey
        ? { isFallback: true, fallbackOf: 'waqi_ground_station' }
        : undefined,
    );
    return Number(
      data.current?.us_aqi ?? (data.hourly?.us_aqi ?? []).find((v) => v != null) ?? 0,
    );
  } catch {
    return 0;
  }
}

export async function checkWeatherTriggers(
  zone: { lat: number; lng: number },
  tomorrowKey: string | undefined,
  waqiKey: string | undefined,
  ctx?: AdjudicatorInstrumentationContext,
): Promise<TriggerCandidate[]> {
  const T = triggersFromContext();
  const { lat, lng } = zone;
  const candidates: TriggerCandidate[] = [];

  let heatSustained3h = false;
  let heatRawData: Record<string, unknown> = {};
  let precip = 0;
  let precipRawData: Record<string, unknown> = {};

  try {
    const forecast = await probeSource(ctx, 'openmeteo_forecast', () =>
      fetchWithRetry<{
        hourly?: { time?: string[]; temperature_2m?: (number | null)[] };
      }>(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m&past_hours=24&forecast_hours=0&timeformat=iso8601`,
        undefined,
        { cacheTtlMs: EXTERNAL_APIS.CACHE_WEATHER_TTL_MS },
      ),
    );
    const times = forecast.hourly?.time ?? [];
    const temps = forecast.hourly?.temperature_2m ?? [];
    const now = new Date();
    const last3: number[] = [];
    for (let i = times.length - 1; i >= 0 && last3.length < 3; i--) {
      const t = new Date(times[i]);
      if (t <= now) {
        const v = temps[i];
        if (v != null && typeof v === 'number') last3.push(v);
      }
    }
    if (
      last3.length >= T.HEAT_SUSTAINED_HOURS &&
      last3.every((v) => v >= T.HEAT_THRESHOLD_C)
    ) {
      heatSustained3h = true;
      heatRawData = {
        ...forecast,
        trigger: 'extreme_heat',
        source: 'openmeteo_forecast',
      };
    }
  } catch {
    /* try Tomorrow.io below */
  }

  if (!heatSustained3h && tomorrowKey) {
    try {
      const [data, forecastData] = await probeSource(ctx, 'tomorrow_io', () =>
        Promise.all([
          fetchWithRetry<{
            data?: {
              values?: { temperature?: number; precipitationIntensity?: number };
            };
          }>(
            `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${tomorrowKey}`,
            undefined,
            { cacheTtlMs: EXTERNAL_APIS.CACHE_WEATHER_TTL_MS },
          ),
          fetchWithRetry<{
            timelines?: {
              hourly?: Array<{ values?: { temperature?: number } }>;
            };
          }>(
            `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&timesteps=1h&apikey=${tomorrowKey}`,
            undefined,
            { cacheTtlMs: EXTERNAL_APIS.CACHE_WEATHER_TTL_MS },
          ),
        ]),
      );

      heatRawData = data;
      precipRawData = data;
      const vals = data.data?.values ?? {};
      const temp = vals.temperature ?? 0;
      precip = vals.precipitationIntensity ?? 0;

      if (temp >= T.HEAT_THRESHOLD_C) {
        const hourly = forecastData.timelines?.hourly ?? [];
        let streak = 0;
        for (const interval of hourly) {
          const t = interval.values?.temperature ?? 0;
          streak = t >= T.HEAT_THRESHOLD_C ? streak + 1 : 0;
          if (streak >= T.HEAT_SUSTAINED_HOURS) break;
        }
        heatSustained3h = streak >= T.HEAT_SUSTAINED_HOURS;
      }
    } catch {
      /* skip zone */
    }
  }

  if (heatSustained3h) {
    candidates.push({
      type: 'weather',
      subtype: 'extreme_heat',
      severity: 8,
      geofence: {
        type: 'circle',
        lat,
        lng,
        radius_km: T.DEFAULT_GEOFENCE_RADIUS_KM,
      },
      raw: {
        ...heatRawData,
        trigger: 'extreme_heat',
        source:
          typeof heatRawData.source === 'string'
            ? heatRawData.source
            : 'tomorrow_io',
      },
    });
  }

  if (tomorrowKey && precip >= T.RAIN_THRESHOLD_MM_H) {
    candidates.push({
      type: 'weather',
      subtype: 'heavy_rain',
      severity: 7,
      geofence: {
        type: 'circle',
        lat,
        lng,
        radius_km: T.DEFAULT_GEOFENCE_RADIUS_KM,
      },
      raw: { ...precipRawData, trigger: 'heavy_rain', source: 'tomorrow_io' },
    });
  }

  try {
    const today = new Date();
    const lookbackDays = EXTERNAL_APIS.AQI_HISTORICAL_LOOKBACK_DAYS;
    const historyStart = new Date(today.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const startDate = toDateString(historyStart);
    const endDate = toDateString(today);

    const [currentAqi, historical] = await Promise.all([
      fetchCurrentAqi(lat, lng, waqiKey, ctx),
      probeSource(ctx, 'openmeteo_aqi_historical', () =>
        fetchWithRetry<{
          hourly?: { us_aqi?: (number | null)[] };
        }>(
          `https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&start_date=${startDate}&end_date=${endDate}`,
          undefined,
          {
            cacheTtlMs: EXTERNAL_APIS.CACHE_AQI_TTL_MS,
            timeoutMs: EXTERNAL_APIS.OPENMETEO_AQI_HISTORICAL_TIMEOUT_MS,
          },
        ),
      ),
    ]);

    const historicalValues = (historical.hourly?.us_aqi ?? []).filter(
      (v): v is number => v != null && v > 0,
    );

    let adaptiveThreshold = 300;
    let baseline75 = 0;
    let baseline90 = 0;
    let baselineMean = 0;
    let isChronic = false;

    if (historicalValues.length >= 48) {
      const sorted = [...historicalValues].sort((a, b) => a - b);
      baseline75 = sorted[Math.floor(sorted.length * 0.75)];
      baseline90 = sorted[Math.floor(sorted.length * 0.90)];
      baselineMean = Math.round(
        historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length,
      );

      isChronic = baseline75 >= T.AQI_CHRONIC_P75_FLOOR;

      if (isChronic) {
        // Chronically polluted zone (e.g., Delhi, Lucknow, Kanpur):
        // use p90 with a tighter multiplier so only truly anomalous spikes trigger.
        adaptiveThreshold = Math.min(
          T.AQI_MAX_THRESHOLD,
          Math.max(
            T.AQI_CHRONIC_MIN_THRESHOLD,
            Math.round(baseline90 * T.AQI_CHRONIC_MULTIPLIER),
          ),
        );
      } else {
        // Clean-to-moderate zone (e.g., Bangalore, coastal cities):
        // use p75 with standard multiplier.
        adaptiveThreshold = Math.min(
          T.AQI_MAX_THRESHOLD,
          Math.max(
            T.AQI_MIN_THRESHOLD,
            Math.round(baseline75 * T.AQI_EXCESS_MULTIPLIER),
          ),
        );
      }
    }

    if (currentAqi >= adaptiveThreshold) {
      const referenceBaseline = isChronic ? baseline90 : baseline75;
      const excessRatio =
        referenceBaseline > 0 ? (currentAqi - referenceBaseline) / referenceBaseline : 0;
      const severity = Math.min(10, Math.max(6, Math.round(6 + excessRatio * 8)));

      candidates.push({
        type: 'weather',
        subtype: 'severe_aqi',
        severity,
        geofence: {
          type: 'circle',
          lat,
          lng,
          radius_km: T.DEFAULT_GEOFENCE_RADIUS_KM,
        },
        raw: {
          trigger: 'severe_aqi',
          current_aqi: currentAqi,
          adaptive_threshold: adaptiveThreshold,
          baseline_p75: baseline75,
          baseline_p90: baseline90,
          baseline_mean: baselineMean,
          chronic_pollution: isChronic,
          historical_days: Math.round(historicalValues.length / 24),
          excess_percent: Math.round(
            ((currentAqi - referenceBaseline) / Math.max(1, referenceBaseline)) * 100,
          ),
          source: waqiKey ? 'waqi_ground_station' : 'openmeteo_satellite',
        },
      });
    }
  } catch {
    /* skip AQI for this zone */
  }

  return candidates;
}
