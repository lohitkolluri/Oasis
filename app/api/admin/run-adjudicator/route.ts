import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAdjudicator } from "@/lib/adjudicator/run";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/run-adjudicator — Run adjudicator on demand (same as cron).
 * Uses real weather, AQI, news APIs. Admin-only.
 */
export async function POST() {
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

  try {
    const result = await runAdjudicator();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Adjudicator failed" },
      { status: 503 }
    );
  }
}
