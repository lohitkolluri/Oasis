/**
 * Dynamic weekly premium calculation.
 * Uses historical disruption frequency in the rider's zone (hyper-local).
 * Base premium + risk adjustment from past events + forecast factor.
 */

import { isWithinCircle } from "@/lib/utils/geo";

const BASE_PREMIUM = 79;
const MAX_PREMIUM = 149;
const RISK_FACTOR_PER_EVENT = 8;
const WEEKS_LOOKBACK = 4;

export interface PremiumInput {
  zoneName?: string | null;
  zoneLatitude?: number | null;
  zoneLongitude?: number | null;
  historicalEventCount?: number;
  forecastRiskFactor?: number; // 0–1, from next-week forecast
}

export function calculateWeeklyPremium(input: PremiumInput): number {
  const events = input.historicalEventCount ?? 0;
  const forecastFactor = input.forecastRiskFactor ?? 0;
  const riskFromEvents = Math.min(events * RISK_FACTOR_PER_EVENT, MAX_PREMIUM - BASE_PREMIUM);
  const riskFromForecast = forecastFactor * 15;
  const riskAdjustment = Math.min(riskFromEvents + riskFromForecast, MAX_PREMIUM - BASE_PREMIUM);
  return Math.round(BASE_PREMIUM + riskAdjustment);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getHistoricalEventCount(
  supabase: any,
  zoneLatitude?: number | null,
  zoneLongitude?: number | null
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - WEEKS_LOOKBACK * 7);

  const { data } = await supabase
    .from("live_disruption_events")
    .select("id, geofence_polygon")
    .gte("created_at", since.toISOString());

  const events = data ?? [];

  if (zoneLatitude == null || zoneLongitude == null) {
    return Math.floor(events.length / 2);
  }

  let zoneMatchCount = 0;
  for (const ev of events) {
    const gf = ev?.geofence_polygon as
      | { type?: string; lat?: number; lng?: number; radius_km?: number }
      | undefined;
    if (!gf?.lat || !gf?.lng) {
      // No geofence = citywide event, counts for everyone
      zoneMatchCount++;
      continue;
    }
    if (isWithinCircle(zoneLatitude, zoneLongitude, gf.lat, gf.lng, gf.radius_km ?? 10)) {
      zoneMatchCount++;
    }
  }
  return zoneMatchCount;
}

/**
 * Fetch Tomorrow.io forecast and return a 0–1 risk factor for the next 5 days.
 *
 * Fix: the hourly forecast field is `precipitationIntensity`, not `rainIntensity`.
 * Fix: divide trigger hours by the actual forecast window instead of a fixed 24.
 */
export async function getForecastRiskFactor(
  _supabase: unknown,
  lat: number,
  lng: number
): Promise<number> {
  const key = process.env.TOMORROW_IO_API_KEY;
  if (!key) return 0;
  try {
    const res = await fetch(
      `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&timesteps=1h&apikey=${key}`
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      timelines?: {
        hourly?: Array<{ values?: { temperature?: number; precipitationIntensity?: number } }>;
      };
    };
    const hourly = data.timelines?.hourly ?? [];
    if (hourly.length === 0) return 0;

    let triggerHours = 0;
    for (const interval of hourly) {
      const temp = interval.values?.temperature ?? 0;
      const precip = interval.values?.precipitationIntensity ?? 0;
      if (temp >= 43 || precip >= 4) triggerHours++;
    }
    // Normalise against the actual forecast window (not a hard-coded 24)
    return Math.min(1, triggerHours / hourly.length);
  } catch {
    return 0;
  }
}
