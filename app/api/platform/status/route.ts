/**
 * Simulated platform API (Zepto/Blinkit) — returns delivery status for rider's zone.
 * In production this would call actual platform APIs.
 *
 * Fixes applied:
 *  - Deduplicated redundant second "2 hours ago" Date construction
 *  - isWithinCircle replaced with shared utility from lib/utils/geo
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isWithinCircle } from "@/lib/utils/geo";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("zone_latitude, zone_longitude, platform")
    .eq("id", user.id)
    .single();

  const zoneLat = profile?.zone_latitude ?? 12.9716;
  const zoneLng = profile?.zone_longitude ?? 77.5946;

  // Single cutoff used for both disruption events and self-reports
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const eventsRes = await supabase
    .from("live_disruption_events")
    .select("id, geofence_polygon, severity_score")
    .gte("created_at", twoHoursAgo)
    .gte("severity_score", 7);

  // rider_delivery_reports may not exist in all environments
  let reportsData: Array<{ zone_lat: unknown; zone_lng: unknown }> = [];
  try {
    const { data } = await supabase
      .from("rider_delivery_reports")
      .select("zone_lat, zone_lng")
      .gte("created_at", twoHoursAgo);
    reportsData = data ?? [];
  } catch {
    // Table not yet migrated — silently skip
  }

  const affectingEvents = (eventsRes.data ?? []).filter(
    (ev: { geofence_polygon: unknown; severity_score: number }) => {
      const gf = ev.geofence_polygon as
        | { lat?: number; lng?: number; radius_km?: number }
        | undefined;
      if (!gf?.lat || !gf?.lng) return true;
      return isWithinCircle(zoneLat, zoneLng, gf.lat, gf.lng, gf.radius_km ?? 10);
    }
  );

  const maxSeverity = affectingEvents.reduce(
    (m: number, e: { severity_score: number }) => Math.max(m, e.severity_score ?? 0),
    0
  );

  let status: "normal" | "limited" | "paused" = "normal";
  if (affectingEvents.length > 0) {
    status = maxSeverity >= 8 ? "paused" : "limited";
  }

  const selfReportsLast2h = reportsData.filter((r) => {
    const rLat = r.zone_lat != null ? Number(r.zone_lat) : null;
    const rLng = r.zone_lng != null ? Number(r.zone_lng) : null;
    if (rLat == null || rLng == null) return false;
    return isWithinCircle(rLat, rLng, zoneLat, zoneLng, 15);
  }).length;

  return NextResponse.json({
    platform: profile?.platform ?? "zepto",
    status,
    message:
      status === "normal"
        ? "Deliveries operating normally"
        : status === "limited"
          ? "Reduced capacity due to disruption in your zone"
          : "Deliveries paused in your zone due to severe disruption",
    affecting_events: affectingEvents.length,
    self_reports_last_2h: selfReportsLast2h,
    last_checked: new Date().toISOString(),
  });
}
