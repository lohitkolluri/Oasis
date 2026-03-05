/**
 * POST /api/admin/demo-trigger
 *
 * Injects a synthetic disruption event and immediately runs the adjudicator
 * against it. Used for demo recordings and testing the full claim → payout
 * pipeline without waiting for real-world events.
 *
 * Body: { eventSubtype, lat, lng, radiusKm?, severity? }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAdjudicator } from "@/lib/adjudicator/run";
import type { DemoTriggerOptions } from "@/lib/adjudicator/run";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_SUBTYPES = [
  "extreme_heat",
  "heavy_rain",
  "severe_aqi",
  "traffic_gridlock",
  "zone_curfew",
] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdmin(user, profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { eventSubtype, lat, lng, radiusKm, severity } = body;

  if (!VALID_SUBTYPES.includes(eventSubtype as (typeof VALID_SUBTYPES)[number])) {
    return NextResponse.json(
      { error: `Invalid eventSubtype. Must be one of: ${VALID_SUBTYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat and lng are required numbers" },
      { status: 400 }
    );
  }

  const demoOptions: DemoTriggerOptions = {
    eventSubtype: eventSubtype as DemoTriggerOptions["eventSubtype"],
    lat,
    lng,
    radiusKm: typeof radiusKm === "number" ? radiusKm : 15,
    severity: typeof severity === "number" ? severity : 8,
  };

  try {
    const result = await runAdjudicator(demoOptions);
    return NextResponse.json({ ok: true, demo: true, ...result });
  } catch (err) {
    console.error("[admin/demo-trigger] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Demo trigger failed" },
      { status: 503 }
    );
  }
}
