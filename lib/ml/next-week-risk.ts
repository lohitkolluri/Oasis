/**
 * Predictive analytics: next week's likely disruption claims.
 * Uses Tomorrow.io forecast when available, else historical rate.
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
                rainIntensity?: number;
                precipitationIntensity?: number;
              };
            }>;
          };
        };
        const hourly = data.timelines?.hourly ?? [];
        let triggerHours = 0;
        const triggers: string[] = [];

        for (const int of hourly) {
          const vals = int.values ?? {};
          const temp = vals.temperature ?? 0;
          const precip = vals.rainIntensity ?? vals.precipitationIntensity ?? 0;
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
        const avgClaimsPerTrigger = 2; // Approximate
        const estClaims = Math.min(
          Math.round(triggerHours * avgClaimsPerTrigger * (activePolicyCount / 10)),
          activePolicyCount * 3
        );
        const low = Math.max(0, estClaims - 2);
        const high = estClaims + 2;

        let riskLevel: "low" | "medium" | "high" = "low";
        if (triggerHours >= 10) riskLevel = "high";
        else if (triggerHours >= 3) riskLevel = "medium";

        return {
          expectedClaimsRange: `${low}–${high}`,
          riskLevel,
          source: "forecast",
          details:
            triggers.length > 0
              ? `Forecast: ${triggers.join(", ")} risk (${triggerHours}h above thresholds)`
              : "No extreme weather in 5‑day forecast",
        };
      }
    } catch {
      // Fall through to historical
    }
  }

  const { count } = await supabase
    .from("parametric_claims")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  const claimsLast2Weeks = count ?? 0;
  const avgPerWeek = Math.round(claimsLast2Weeks / 2);
  const low = Math.max(0, avgPerWeek - 1);
  const high = avgPerWeek + 1;

  return {
    expectedClaimsRange: `${low}–${high}`,
    riskLevel: avgPerWeek >= 5 ? "high" : avgPerWeek >= 2 ? "medium" : "low",
    source: "historical",
    details: `Based on ${claimsLast2Weeks} claims in last 14 days`,
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
