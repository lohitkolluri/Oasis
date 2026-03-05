/**
 * Predictive analytics: next week's likely disruption claims.
 * Uses Tomorrow.io forecast when available, else historical rate.
 *
 * Fixes applied:
 *  - M3: Uses rider's actual zone coordinates instead of hardcoded Bangalore
 *  - Uses shared constants and retry utilities
 *  - Improved historical trend calculation
 */

import { DEFAULT_ZONE, EXTERNAL_APIS } from '@/lib/config/constants';
import { fetchWithRetry } from '@/lib/utils/retry';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface NextWeekPrediction {
  expectedClaimsRange: string;
  riskLevel: 'low' | 'medium' | 'high';
  source: 'forecast' | 'historical';
  details?: string;
  aqiRisk?: string;
}

/**
 * Get next-week predictions for a specific zone.
 * M3 fix: accepts lat/lng parameters instead of using hardcoded coordinates.
 */
export async function getNextWeekPrediction(
  supabase: SupabaseClient,
  zoneLat?: number | null,
  zoneLng?: number | null,
): Promise<NextWeekPrediction> {
  const lat = zoneLat ?? DEFAULT_ZONE.lat;
  const lng = zoneLng ?? DEFAULT_ZONE.lng;
  const tomorrowKey = process.env.TOMORROW_IO_API_KEY;

  if (tomorrowKey) {
    try {
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
        `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&timesteps=1h&apikey=${tomorrowKey}`,
        undefined,
        { cacheTtlMs: EXTERNAL_APIS.CACHE_WEATHER_TTL_MS },
      );

      const hourly = data.timelines?.hourly ?? [];
      let triggerHours = 0;
      const triggers: string[] = [];

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

      // Factor in AQI forecast too
      let aqiRiskStr: string | undefined;
      try {
        const aqiData = await fetchWithRetry<{
          hourly?: { us_aqi?: (number | null)[] };
        }>(
          `https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&forecast_days=5`,
          undefined,
          { cacheTtlMs: EXTERNAL_APIS.CACHE_AQI_TTL_MS },
        );
        const aqiValues = (aqiData.hourly?.us_aqi ?? []).filter(
          (v): v is number => v != null,
        );
        const highAqiHours = aqiValues.filter((v) => v >= 150).length;
        if (highAqiHours > 0) {
          triggers.push('aqi');
          triggerHours += Math.round(highAqiHours * 0.5);
          aqiRiskStr = `${highAqiHours}h of poor AQI (≥150) in 5-day forecast`;
        }
      } catch {
        // Skip
      }

      const activePolicyCount = await getActivePolicyCount(supabase);
      const severityWeight = triggers.includes('heat') ? 1.2 : 1;
      const policyFactor = Math.max(1, Math.sqrt(activePolicyCount));
      const estClaims = Math.min(
        Math.round(triggerHours * severityWeight * 0.15 * policyFactor),
        activePolicyCount * 3,
      );
      const low = Math.max(0, Math.round(estClaims * 0.6));
      const high = Math.round(estClaims * 1.4) + 1;

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (
        triggerHours >= 10 ||
        (triggerHours >= 5 && triggers.includes('heat'))
      )
        riskLevel = 'high';
      else if (triggerHours >= 3 || triggers.length >= 2) riskLevel = 'medium';

      return {
        expectedClaimsRange: `${low}–${high}`,
        riskLevel,
        source: 'forecast',
        details:
          triggers.length > 0
            ? `Forecast: ${triggers.join(', ')} risk (${triggerHours}h above thresholds)`
            : 'No extreme weather in 5-day forecast',
        aqiRisk: aqiRiskStr,
      };
    } catch {
      // Fall through to historical
    }
  }

  // --- Historical fallback ---
  const { data: recentClaims } = await supabase
    .from('parametric_claims')
    .select('id, created_at')
    .gte(
      'created_at',
      new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    )
    .order('created_at', { ascending: true });

  const all = recentClaims ?? [];
  const avgPerWeek = all.length / 3;

  const week1 = all.filter(
    (c) =>
      new Date(c.created_at) <
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  ).length;
  const week3 = all.filter(
    (c) =>
      new Date(c.created_at) >=
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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

async function getActivePolicyCount(
  supabase: SupabaseClient,
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('weekly_policies')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .lte('week_start_date', today)
    .gte('week_end_date', today);
  return count ?? 0;
}
