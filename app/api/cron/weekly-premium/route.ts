/**
 * Cron handler: compute weekly premium recommendations for all profiles.
 *
 * Fixes applied:
 *  - Deduplicates Tomorrow.io API calls: profiles sharing the same zone
 *    coordinates reuse a single forecast fetch instead of each making its own
 *  - Profile recommendations processed in parallel batches (not serially)
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  calculateWeeklyPremium,
  getHistoricalEventCount,
  getForecastRiskFactor,
} from "@/lib/ml/premium-calc";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getNextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().split("T")[0];
}

/** Round coordinate to 2 decimal places (~1 km precision) for deduplication. */
function zoneKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const weekStart = getNextMonday();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, zone_latitude, zone_longitude");

  const allProfiles = profiles ?? [];

  // Build a map of unique zone keys → forecast risk factor (one API call per zone)
  const uniqueZones = new Map<string, { lat: number; lng: number }>();
  for (const p of allProfiles) {
    const lat = p.zone_latitude ?? 12.9716;
    const lng = p.zone_longitude ?? 77.5946;
    const key = zoneKey(lat, lng);
    if (!uniqueZones.has(key)) uniqueZones.set(key, { lat, lng });
  }

  // Fetch forecast for every unique zone in parallel
  const forecastMap = new Map<string, number>();
  await Promise.all(
    Array.from(uniqueZones.entries()).map(async ([key, { lat, lng }]) => {
      const risk = await getForecastRiskFactor(supabase, lat, lng);
      forecastMap.set(key, risk);
    })
  );

  // Process all profiles concurrently (capped at 10 at a time to respect DB limits)
  const CONCURRENCY = 10;
  let computed = 0;

  for (let i = 0; i < allProfiles.length; i += CONCURRENCY) {
    const batch = allProfiles.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (profile) => {
        const zoneLat = profile.zone_latitude ?? 12.9716;
        const zoneLng = profile.zone_longitude ?? 77.5946;
        const key = zoneKey(zoneLat, zoneLng);

        const [eventCount, forecastRisk] = await Promise.all([
          getHistoricalEventCount(supabase, zoneLat, zoneLng),
          Promise.resolve(forecastMap.get(key) ?? 0),
        ]);

        const premium = calculateWeeklyPremium({
          historicalEventCount: eventCount,
          forecastRiskFactor: forecastRisk,
        });

        const { error } = await supabase.from("premium_recommendations").upsert(
          {
            profile_id: profile.id,
            week_start_date: weekStart,
            recommended_premium_inr: premium,
            historical_event_count: eventCount,
            forecast_risk_factor: forecastRisk,
          },
          { onConflict: "profile_id,week_start_date" }
        );

        if (error) throw error;
        return true;
      })
    );

    computed += results.filter((r) => r.status === "fulfilled").length;
  }

  return NextResponse.json({
    message: "Weekly premium recommendations computed",
    week_start: weekStart,
    profiles_processed: allProfiles.length,
    unique_zones: uniqueZones.size,
    recommendations_upserted: computed,
    sample_premium_low_risk: calculateWeeklyPremium({ historicalEventCount: 0 }),
    sample_premium_high_risk: calculateWeeklyPremium({ historicalEventCount: 5 }),
  });
}
