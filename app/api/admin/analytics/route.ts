/**
 * GET /api/admin/analytics
 *
 * Returns time-series and breakdown data for the admin analytics dashboard.
 * B6 fix: date range params; premiums scoped by week_start_date (aligned with claims window).
 * P3 fix: full-period rows for summaries (no row cap that skewed loss ratio / flagged counts).
 */

import { getISTMondayYmdForInstant, getISTDateString } from '@/lib/datetime/ist';
import { getNextWeekPrediction } from '@/lib/ml/next-week-risk';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (ctx, request) => {
  const url = new URL(request.url);
  const daysBack = Math.min(
    parseInt(url.searchParams.get('days') ?? '30', 10) || 30,
    90,
  );
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') ?? '500', 10) || 500,
    1000,
  );

  const admin = createAdminClient();
  const sinceInstant = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const sinceDate = sinceInstant.toISOString();
  /** Match premium rows to the same calendar window as claims (IST policy dates). */
  const sinceWeekStartDay = getISTDateString(sinceInstant);

  const [claimsRes, policiesRes, eventsRes] = await Promise.all([
    admin
      .from('parametric_claims')
      .select(
        'payout_amount_inr, created_at, is_flagged, disruption_event_id',
      )
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: true }),
    admin
      .from('weekly_policies')
      .select('weekly_premium_inr, week_start_date, created_at')
      .gte('week_start_date', sinceWeekStartDay)
      .order('week_start_date', { ascending: true }),
    admin
      .from('live_disruption_events')
      .select('event_type, severity_score, created_at')
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: true }),
  ]);

  const claims = claimsRes.data ?? [];
  const policies = policiesRes.data ?? [];
  const events = eventsRes.data ?? [];

  // ── Claims per day ────────────────────────────────────────────────────
  const claimsByDay = new Map<
    string,
    { claims: number; payout: number; flagged: number }
  >();
  for (const c of claims) {
    const day = getISTDateString(new Date(c.created_at));
    const prev = claimsByDay.get(day) ?? { claims: 0, payout: 0, flagged: 0 };
    claimsByDay.set(day, {
      claims: prev.claims + 1,
      payout: prev.payout + Number(c.payout_amount_inr),
      flagged: prev.flagged + (c.is_flagged === true ? 1 : 0),
    });
  }
  const claimsTimeline = Array.from(claimsByDay.entries()).map(
    ([date, v]) => ({ date, claims: v.claims, payout: v.payout, flagged: v.flagged }),
  );

  // ── Premiums per week ────────────────────────────────────────────────
  const premiumsByWeek = new Map<string, number>();
  for (const p of policies) {
    const week = p.week_start_date ?? p.created_at.slice(0, 10);
    premiumsByWeek.set(
      week,
      (premiumsByWeek.get(week) ?? 0) + Number(p.weekly_premium_inr),
    );
  }
  const premiumsTimeline = Array.from(premiumsByWeek.entries()).map(
    ([week, amount]) => ({ week, amount }),
  );

  // ── Loss ratio per week ────────────────────────────────────────────────
  const payoutsByWeek = new Map<string, number>();
  for (const c of claims) {
    const d = new Date(c.created_at);
    const week = getISTMondayYmdForInstant(d);
    payoutsByWeek.set(
      week,
      (payoutsByWeek.get(week) ?? 0) + Number(c.payout_amount_inr),
    );
  }

  const lossRatioTimeline = Array.from(premiumsByWeek.entries()).map(
    ([week, premium]) => {
      const payout = payoutsByWeek.get(week) ?? 0;
      return {
        week,
        premium,
        payout,
        lossRatio:
          premium > 0 ? Math.round((payout / premium) * 100) : 0,
      };
    },
  );

  // ── Trigger type breakdown ────────────────────────────────────────────
  const typeCount = new Map<string, number>();
  for (const e of events) {
    typeCount.set(e.event_type, (typeCount.get(e.event_type) ?? 0) + 1);
  }
  const triggerBreakdown = Array.from(typeCount.entries()).map(
    ([type, count]) => ({ type, count }),
  );

  // ── Severity distribution ──────────────────────────────────────────────
  const severityBuckets = { low: 0, medium: 0, high: 0 };
  for (const e of events) {
    const s = e.severity_score ?? 0;
    if (s < 5) severityBuckets.low++;
    else if (s < 8) severityBuckets.medium++;
    else severityBuckets.high++;
  }

  // ── Events per day (for timeline chart) ─────────────────────────────────
  const eventsByDay = new Map<string, number>();
  for (const e of events) {
    const day = e.created_at.slice(0, 10);
    eventsByDay.set(day, (eventsByDay.get(day) ?? 0) + 1);
  }
  const eventsTimeline = Array.from(eventsByDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Summary stats ──────────────────────────────────────────────────────
  const totalPayout = claims.reduce(
    (s, c) => s + Number(c.payout_amount_inr),
    0,
  );
  const totalPremium = policies.reduce(
    (s, p) => s + Number(p.weekly_premium_inr),
    0,
  );

  // ── Predictive analytics (next week) ──────────────────────────────────
  let prediction = null;
  try {
    prediction = await getNextWeekPrediction(admin);
  } catch (err) {
    console.warn("Next-week prediction failed:", err);
  }

  return NextResponse.json({
    summary: {
      totalClaims: claims.length,
      totalPayout,
      totalPremium,
      lossRatio:
        totalPremium > 0
          ? Math.round((totalPayout / totalPremium) * 100)
          : 0,
      flaggedClaims: claims.filter((c) => c.is_flagged === true).length,
      totalEvents: events.length,
    },
    claimsTimeline,
    premiumsTimeline,
    lossRatioTimeline,
    eventsTimeline,
    triggerBreakdown,
    severityBuckets,
    prediction,
    meta: {
      daysBack,
      limit,
    },
  });
});
