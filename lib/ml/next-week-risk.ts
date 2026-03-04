/**
 * Predictive analytics: next week's likely disruption claims.
 * Uses Tomorrow.io forecast when available, else historical rate.
 *
 * Fixes applied:
 *  - API field: rainIntensity → precipitationIntensity (Tomorrow.io hourly schema)
 *  - Historical trend: was dividing per-day delta by 7 then adding to per-week avg
 *    (mixed units). Now stays consistently in per-week units.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface NextWeekPrediction {
  expectedClaimsRange: string;
  riskLevel: "low" | "medium" | "high";
  source: "forecast" | "historical";
  details?: string;
}

const LAT = 12.9716;
const LNG = 77.5946;

export async function getNextWeekPrediction(
  supabase: SupabaseClient
): Promise<NextWeekPrediction> {
  const tomorrowKey = process.env.TOMORROW_IO_API_KEY;

  if (tomorrowKey) {
    try {
      const res = await fetch(
        `https://api.tomorrow.io/v4/weather/forecast?location=${LAT},${LNG}&timesteps=1h&apikey=${tomorrowKey}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          timelines?: {
            hourly?: Array<{
              time?: string;
              values?: {
                temperature?: number;
                precipitationIntensity?: number;
              };
            }>;
          };
        };
        const hourly = data.timelines?.hourly ?? [];
        let triggerHours = 0;
        const triggers: string[] = [];

        for (const interval of hourly) {
          const vals = interval.values ?? {};
          const temp = vals.temperature ?? 0;
          const precip = vals.precipitationIntensity ?? 0;
          if (temp >= 43) {
            triggerHours++;
            if (!triggers.includes("heat")) triggers.push("heat");
          }
          if (precip >= 4) {
            triggerHours++;
            if (!triggers.includes("rain")) triggers.push("rain");
          }
        }

        const activePolicyCount = await getActivePolicyCount(supabase);
        const severityWeight = triggers.includes("heat") ? 1.2 : 1;
        const policyFactor = Math.max(1, Math.sqrt(activePolicyCount));
        const estClaims = Math.min(
          Math.round(triggerHours * severityWeight * 0.15 * policyFactor),
          activePolicyCount * 3
        );
        const low = Math.max(0, Math.round(estClaims * 0.6));
        const high = Math.round(estClaims * 1.4) + 1;

        let riskLevel: "low" | "medium" | "high" = "low";
        if (triggerHours >= 10 || (triggerHours >= 5 && triggers.includes("heat")))
          riskLevel = "high";
        else if (triggerHours >= 3 || triggers.length >= 2) riskLevel = "medium";

        return {
          expectedClaimsRange: `${low}–${high}`,
          riskLevel,
          source: "forecast",
          details:
            triggers.length > 0
              ? `Forecast: ${triggers.join(", ")} risk (${triggerHours}h above thresholds)`
              : "No extreme weather in 5-day forecast",
        };
      }
    } catch {
      // Fall through to historical
    }
  }

  // --- Historical fallback ---
  const { data: recentClaims } = await supabase
    .from("parametric_claims")
    .select("id, created_at")
    .gte("created_at", new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  const all = recentClaims ?? [];
  const avgPerWeek = all.length / 3;

  // Split into three 7-day buckets and compare first vs last bucket
  // (fix: was mixing per-day delta with per-week avg)
  const week1 = all.filter(
    (c) => new Date(c.created_at) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  ).length;
  const week3 = all.filter(
    (c) => new Date(c.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;
  // Trend expressed in claims-per-week (same unit as avgPerWeek)
  const weeklyTrend = all.length >= 3 ? (week3 - week1) / 2 : 0;
  const adjusted = Math.max(0, Math.round(avgPerWeek + weeklyTrend));
  const low = Math.max(0, adjusted - 2);
  const high = adjusted + 2;

  return {
    expectedClaimsRange: `${low}–${high}`,
    riskLevel: avgPerWeek >= 5 ? "high" : avgPerWeek >= 2 ? "medium" : "low",
    source: "historical",
    details: `Based on ${all.length} claims over the last 21 days`,
  };
}

async function getActivePolicyCount(supabase: SupabaseClient): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { count } = await supabase
    .from("weekly_policies")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .lte("week_start_date", today)
    .gte("week_end_date", today);
  return count ?? 0;
}
