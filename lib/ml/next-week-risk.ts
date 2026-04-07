/**
 * Predictive analytics: next week's likely disruption claims.
 * Aggregates forecasts across ALL active rider zones.
 * Falls back to historical claim rate when no API key is configured.
 */

import {
  DEFAULT_ZONE,
  EXTERNAL_APIS,
  WEEKLY_POLICY_EARNED_PREMIUM_STATUSES,
} from '@/lib/config/constants';
import { getTomorrowApiKey } from '@/lib/config/env';
import { getISTDateString } from '@/lib/datetime/ist';
import { fetchWithRetry } from '@/lib/utils/retry';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface NextWeekPrediction {
  expectedClaimsRange: string;
  riskLevel: 'low' | 'medium' | 'high';
  source: 'forecast' | 'historical';
  details?: string;
  aqiRisk?: string;
  zonesChecked?: number;
}

const FORECAST_ZONE_CONCURRENCY = 4;

export async function getNextWeekPrediction(
  supabase: SupabaseClient,
  zoneLat?: number | null,
  zoneLng?: number | null,
): Promise<NextWeekPrediction> {
  const tomorrowKey = getTomorrowApiKey();

  if (tomorrowKey) {
    try {
      const zones = await getActiveZones(supabase);
      if (zoneLat != null && zoneLng != null) {
        zones.push({ lat: zoneLat, lng: zoneLng });
      }
      if (zones.length === 0) {
        zones.push({ lat: DEFAULT_ZONE.lat, lng: DEFAULT_ZONE.lng });
      }

      const uniqueZones = deduplicateZones(zones);

      let totalTriggerHours = 0;
      const allTriggers = new Set<string>();
      let totalAqiHighHours = 0;

      const results = await allSettledWithConcurrency(uniqueZones, FORECAST_ZONE_CONCURRENCY, (z) =>
        checkZoneForecast(z.lat, z.lng, tomorrowKey),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalTriggerHours += result.value.triggerHours;
          result.value.triggers.forEach((t) => allTriggers.add(t));
          totalAqiHighHours += result.value.aqiHighHours;
        }
      }

      const activePolicyCount = await getActivePolicyCount(supabase);
      const triggers = Array.from(allTriggers);
      const severityWeight = triggers.includes('heat') ? 1.2 : 1;
      const policyFactor = Math.max(1, Math.sqrt(activePolicyCount));
      const estClaims = Math.min(
        Math.round(totalTriggerHours * severityWeight * 0.15 * policyFactor),
        activePolicyCount * 3,
      );
      const low = Math.max(0, Math.round(estClaims * 0.6));
      const high = Math.round(estClaims * 1.4) + 1;

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (totalTriggerHours >= 10 || (totalTriggerHours >= 5 && triggers.includes('heat')))
        riskLevel = 'high';
      else if (totalTriggerHours >= 3 || triggers.length >= 2) riskLevel = 'medium';

      let aqiRiskStr: string | undefined;
      if (totalAqiHighHours > 0) {
        aqiRiskStr = `${totalAqiHighHours}h of poor AQI (≥150) across ${uniqueZones.length} zone${uniqueZones.length > 1 ? 's' : ''}`;
      }

      const detailParts: string[] = [];
      if (triggers.length > 0) {
        detailParts.push(
          `${triggers.join(', ')} risk detected (${totalTriggerHours}h above thresholds)`,
        );
      }
      if (uniqueZones.length > 1) {
        detailParts.push(`Checked ${uniqueZones.length} active zones`);
      }

      return {
        expectedClaimsRange: `${low}–${high}`,
        riskLevel,
        source: 'forecast',
        details:
          detailParts.length > 0
            ? detailParts.join('. ')
            : `No extreme weather in 5-day forecast across ${uniqueZones.length} zone${uniqueZones.length > 1 ? 's' : ''}`,
        aqiRisk: aqiRiskStr,
        zonesChecked: uniqueZones.length,
      };
    } catch {
      // Fall through to historical
    }
  }

  // --- Historical fallback ---
  const { data: recentClaims } = await supabase
    .from('parametric_claims')
    .select('id, created_at')
    .gte('created_at', new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  const all = recentClaims ?? [];
  const avgPerWeek = all.length / 3;

  const week1 = all.filter(
    (c) => new Date(c.created_at) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  ).length;
  const week3 = all.filter(
    (c) => new Date(c.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  ).length;
  const weeklyTrend = all.length >= 3 ? (week3 - week1) / 2 : 0;
  const adjusted = Math.max(0, Math.round(avgPerWeek + weeklyTrend));
  const low = Math.max(0, adjusted - 2);
  const high = adjusted + 2;

  return {
    expectedClaimsRange: `${low}–${high}`,
    riskLevel: avgPerWeek >= 5 ? 'high' : avgPerWeek >= 2 ? 'medium' : 'low',
    source: 'historical',
    details: `Based on ${all.length} claims over the last 21 days`,
  };
}

async function allSettledWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  if (items.length === 0) return [];
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      try {
        const value = await worker(items[current]!);
        results[current] = { status: 'fulfilled', value };
      } catch (reason) {
        results[current] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () =>
    runWorker(),
  );
  await Promise.all(workers);
  return results;
}

async function checkZoneForecast(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<{ triggerHours: number; triggers: string[]; aqiHighHours: number }> {
  const triggers: string[] = [];
  let triggerHours = 0;
  let aqiHighHours = 0;

  const data = await fetchWithRetry<{
    timelines?: {
      hourly?: Array<{
        time?: string;
        values?: {
          temperature?: number;
          precipitationIntensity?: number;
        };
      }>;
    };
  }>(
    `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&timesteps=1h`,
    {
      headers: { 'X-API-Key': apiKey },
    },
    { cacheTtlMs: EXTERNAL_APIS.CACHE_WEATHER_TTL_MS },
  );

  const hourly = data.timelines?.hourly ?? [];
  for (const interval of hourly) {
    const vals = interval.values ?? {};
    const temp = vals.temperature ?? 0;
    const precip = vals.precipitationIntensity ?? 0;
    if (temp >= 43) {
      triggerHours++;
      if (!triggers.includes('heat')) triggers.push('heat');
    }
    if (precip >= 4) {
      triggerHours++;
      if (!triggers.includes('rain')) triggers.push('rain');
    }
  }

  try {
    const aqiData = await fetchWithRetry<{
      hourly?: { us_aqi?: (number | null)[] };
    }>(
      `https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&forecast_days=5`,
      undefined,
      { cacheTtlMs: EXTERNAL_APIS.CACHE_AQI_TTL_MS },
    );
    const aqiValues = (aqiData.hourly?.us_aqi ?? []).filter((v): v is number => v != null);
    aqiHighHours = aqiValues.filter((v) => v >= 150).length;
    if (aqiHighHours > 0) {
      triggers.push('aqi');
      triggerHours += Math.round(aqiHighHours * 0.5);
    }
  } catch {
    // Skip AQI
  }

  return { triggerHours, triggers, aqiHighHours };
}

async function getActiveZones(
  supabase: SupabaseClient,
): Promise<Array<{ lat: number; lng: number }>> {
  const today = getISTDateString();
  const { data: policies } = await supabase
    .from('weekly_policies')
    .select('profile_id')
    .eq('is_active', true)
    .in('payment_status', [...WEEKLY_POLICY_EARNED_PREMIUM_STATUSES])
    .lte('week_start_date', today)
    .gte('week_end_date', today);

  if (!policies || policies.length === 0) return [];

  const profileIds = [...new Set(policies.map((p) => p.profile_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('zone_latitude, zone_longitude')
    .in('id', profileIds);

  if (!profiles) return [];

  return profiles
    .filter((p) => p.zone_latitude != null && p.zone_longitude != null)
    .map((p) => ({ lat: Number(p.zone_latitude), lng: Number(p.zone_longitude) }));
}

function deduplicateZones(
  zones: Array<{ lat: number; lng: number }>,
): Array<{ lat: number; lng: number }> {
  const seen = new Map<string, { lat: number; lng: number }>();
  for (const z of zones) {
    const key = `${Math.round(z.lat * 10) / 10},${Math.round(z.lng * 10) / 10}`;
    if (!seen.has(key)) seen.set(key, z);
  }
  return Array.from(seen.values());
}

async function getActivePolicyCount(supabase: SupabaseClient): Promise<number> {
  const today = getISTDateString();
  const { count } = await supabase
    .from('weekly_policies')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .in('payment_status', [...WEEKLY_POLICY_EARNED_PREMIUM_STATUSES])
    .lte('week_start_date', today)
    .gte('week_end_date', today);
  return count ?? 0;
}
