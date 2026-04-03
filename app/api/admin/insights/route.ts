/**
 * Deterministic admin operations brief.
 * Admin-only. Premiums/loss ratio use the same 30d window as /api/admin/analytics.
 * Fraud "urgent" count = flagged claims still awaiting a decision (admin_review_status IS NULL).
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_ctx) => {
  const adminSupabase = createAdminClient();
  const startedAt = Date.now();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since30dDay = since30d.slice(0, 10);

  const metricsRes = await adminSupabase.rpc('admin_window_metrics', {
    p_since: since30d,
    p_since_week: since30dDay,
    p_since24: since24h,
  });

  const metrics = (metricsRes.data?.[0] ?? null) as {
    total_premium?: number;
    total_payout?: number;
    fraud_pending?: number;
    severe_events_24h?: number;
    reports_24h?: number;
    claims_24h?: number;
    top_trigger?: string;
    top_trigger_count?: number;
  } | null;

  const totalPremiums30d = Number(metrics?.total_premium ?? 0);
  const totalPayouts30d = Number(metrics?.total_payout ?? 0);
  const fraudPending = Number(metrics?.fraud_pending ?? 0);
  const severeEventsCount = Number(metrics?.severe_events_24h ?? 0);
  const reportsLast24h = Number(metrics?.reports_24h ?? 0);
  const claimsLast24h = Number(metrics?.claims_24h ?? 0);

  const lossRatio =
    totalPremiums30d > 0
      ? ((totalPayouts30d / totalPremiums30d) * 100).toFixed(1)
      : '0';

  const topTriggerEntry =
    metrics?.top_trigger && metrics.top_trigger !== 'none'
      ? [metrics.top_trigger, Number(metrics?.top_trigger_count ?? 0)]
      : undefined;

  const headline =
    fraudPending > 0 || reportsLast24h > 0 || severeEventsCount > 0
      ? 'Action needed'
      : 'Platform stable';

  const summaryParts: string[] = [];
  if (fraudPending > 0) {
    summaryParts.push(
      `${fraudPending} flagged claim${fraudPending === 1 ? '' : 's'} await review`,
    );
  }
  if (reportsLast24h > 0) {
    summaryParts.push(
      `${reportsLast24h} rider self-report${reportsLast24h === 1 ? '' : 's'} came in over the last 24h`,
    );
  }
  if (severeEventsCount > 0) {
    summaryParts.push(
      `${severeEventsCount} severe trigger${severeEventsCount === 1 ? '' : 's'} fired today`,
    );
  }
  if (summaryParts.length === 0) {
    summaryParts.push(
      'No urgent fraud queue items, self-report spikes, or severe trigger bursts detected',
    );
  }

  const watchlist: string[] = [];
  if (topTriggerEntry) {
    watchlist.push(
      `Top trigger in the last 24h: ${topTriggerEntry[0]} (${topTriggerEntry[1]} event${topTriggerEntry[1] === 1 ? '' : 's'}).`,
    );
  }
  if (Number(lossRatio) > 80) {
    watchlist.push(
      `Loss ratio is ${lossRatio}% (rolling 30d). Review pricing and payout pressure before the next weekly cycle.`,
    );
  }
  if (claimsLast24h > 0) {
    watchlist.push(
      `${claimsLast24h} claim${claimsLast24h === 1 ? '' : 's'} were created in the last 24h.`,
    );
  }
  if (watchlist.length === 0) {
    watchlist.push('Premiums, claims, and trigger activity are within a normal operating range.');
  }

  const response = NextResponse.json({
    headline,
    summary: `${summaryParts.join('. ')}.`,
    priorities: [
      {
        id: 'fraud',
        label: 'Fraud Queue',
        value: String(fraudPending),
        note:
          fraudPending > 0
            ? 'Flagged claims waiting for a decision'
            : 'No flagged claims awaiting review',
        href: '/admin/fraud',
        tone: fraudPending > 0 ? 'red' : 'emerald',
      },
      {
        id: 'reports',
        label: 'Self Reports',
        value: String(reportsLast24h),
        note:
          reportsLast24h > 0
            ? 'Rider-submitted proofs in the last 24h'
            : 'No manual disruption reports in the last 24h',
        href: '/admin/triggers',
        tone: reportsLast24h > 0 ? 'amber' : 'cyan',
      },
      {
        id: 'triggers',
        label: 'Severe Triggers',
        value: String(severeEventsCount),
        note:
          severeEventsCount > 0
            ? 'High-severity disruption events detected today'
            : 'No severe disruptions detected today',
        href: '/admin/triggers',
        tone: severeEventsCount > 0 ? 'violet' : 'cyan',
      },
      {
        id: 'claims',
        label: 'Claims 24h',
        value: String(claimsLast24h),
        note: `Loss ratio ${lossRatio}% (30d) · ₹${totalPayouts30d.toLocaleString('en-IN')} payouts (30d)`,
        href: '/admin',
        tone: Number(lossRatio) > 80 ? 'amber' : 'emerald',
      },
    ],
    watchlist,
    meta: {
      durationMs: Date.now() - startedAt,
    },
  });

  logger.info('Admin insights generated', {
    durationMs: Date.now() - startedAt,
    fraudPending,
    reportsLast24h,
    severeEventsCount,
  });

  return response;
});
