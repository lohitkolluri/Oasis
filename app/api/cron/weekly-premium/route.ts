import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateWeeklyPremium } from "@/lib/ml/premium-calc";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data: events } = await supabase
    .from("live_disruption_events")
    .select("id")
    .gte("created_at", fourWeeksAgo.toISOString());

  const historicalCount = (events ?? []).length;

  return NextResponse.json({
    message: "Weekly premium model ready",
    historical_events_last_4_weeks: historicalCount,
    sample_premium_low_risk: calculateWeeklyPremium({ historicalEventCount: 0 }),
    sample_premium_high_risk: calculateWeeklyPremium({ historicalEventCount: 5 }),
  });
}
