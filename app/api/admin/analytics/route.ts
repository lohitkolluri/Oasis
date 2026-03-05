/**
 * GET /api/admin/analytics
 *
 * Returns time-series and breakdown data for the admin analytics dashboard:
 *  - claims per day (last 30 days)
 *  - premiums collected per week (last 8 weeks)
 *  - trigger type breakdown
 *  - loss ratio over time
 *  - zone-level claim distribution
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";

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
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdmin(user, profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [claimsRes, policiesRes, eventsRes] = await Promise.all([
    admin
      .from("parametric_claims")
      .select("payout_amount_inr, created_at, is_flagged, disruption_event_id")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
    admin
      .from("weekly_policies")
      .select("weekly_premium_inr, week_start_date, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("week_start_date", { ascending: true }),
    admin
      .from("live_disruption_events")
      .select("event_type, severity_score, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
  ]);

  const claims = claimsRes.data ?? [];
  const policies = policiesRes.data ?? [];
  const events = eventsRes.data ?? [];

  // ── Claims per day ────────────────────────────────────────────────────────
  const claimsByDay = new Map<string, { claims: number; payout: number; flagged: number }>();
  for (const c of claims) {
    const day = c.created_at.slice(0, 10);
    const prev = claimsByDay.get(day) ?? { claims: 0, payout: 0, flagged: 0 };
    claimsByDay.set(day, {
      claims: prev.claims + 1,
      payout: prev.payout + Number(c.payout_amount_inr),
      flagged: prev.flagged + (c.is_flagged ? 1 : 0),
    });
  }
  const claimsTimeline = Array.from(claimsByDay.entries()).map(([date, v]) => ({
    date,
    claims: v.claims,
    payout: v.payout,
    flagged: v.flagged,
  }));

  // ── Premiums per week ────────────────────────────────────────────────────
  const premiumsByWeek = new Map<string, number>();
  for (const p of policies) {
    const week = p.week_start_date ?? p.created_at.slice(0, 10);
    premiumsByWeek.set(week, (premiumsByWeek.get(week) ?? 0) + Number(p.weekly_premium_inr));
  }
  const premiumsTimeline = Array.from(premiumsByWeek.entries()).map(([week, amount]) => ({
    week,
    amount,
  }));

  // ── Loss ratio per week ───────────────────────────────────────────────────
  const payoutsByWeek = new Map<string, number>();
  for (const c of claims) {
    // Find the week this claim falls in (Monday of that week)
    const d = new Date(c.created_at);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    const week = monday.toISOString().slice(0, 10);
    payoutsByWeek.set(week, (payoutsByWeek.get(week) ?? 0) + Number(c.payout_amount_inr));
  }

  const lossRatioTimeline = Array.from(premiumsByWeek.entries()).map(([week, premium]) => {
    const payout = payoutsByWeek.get(week) ?? 0;
    return {
      week,
      premium,
      payout,
      lossRatio: premium > 0 ? Math.round((payout / premium) * 100) : 0,
    };
  });

  // ── Trigger type breakdown ───────────────────────────────────────────────
  const typeCount = new Map<string, number>();
  for (const e of events) {
    typeCount.set(e.event_type, (typeCount.get(e.event_type) ?? 0) + 1);
  }
  const triggerBreakdown = Array.from(typeCount.entries()).map(([type, count]) => ({
    type,
    count,
  }));

  // ── Severity distribution ────────────────────────────────────────────────
  const severityBuckets = { low: 0, medium: 0, high: 0 };
  for (const e of events) {
    const s = e.severity_score ?? 0;
    if (s < 5) severityBuckets.low++;
    else if (s < 8) severityBuckets.medium++;
    else severityBuckets.high++;
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalPayout = claims.reduce((s, c) => s + Number(c.payout_amount_inr), 0);
  const totalPremium = policies.reduce((s, p) => s + Number(p.weekly_premium_inr), 0);

  return NextResponse.json({
    summary: {
      totalClaims: claims.length,
      totalPayout,
      totalPremium,
      lossRatio: totalPremium > 0 ? Math.round((totalPayout / totalPremium) * 100) : 0,
      flaggedClaims: claims.filter((c) => c.is_flagged).length,
      totalEvents: events.length,
    },
    claimsTimeline,
    premiumsTimeline,
    lossRatioTimeline,
    triggerBreakdown,
    severityBuckets,
  });
}
