/**
 * Deterministic admin operations brief.
 * Admin-only. Premiums/loss ratio use the same 30d window as /api/admin/analytics.
 * Fraud "urgent" count = flagged claims still awaiting a decision (admin_review_status IS NULL).
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_ctx) => {
  const adminSupabase = createAdminClient();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since30dDay = since30d.slice(0, 10);

  const [
    policies30dRes,
    claims30dRes,
    fraudPendingRes,
    recentClaimsRes,
    eventsRes,
    reportsRes,
  ] = await Promise.all([
    adminSupabase
      .from('weekly_policies')
      .select('weekly_premium_inr')
      .gte('week_start_date', since30dDay),
    adminSupabase
      .from('parametric_claims')
      .select('payout_amount_inr')
      .gte('created_at', since30d),
    adminSupabase
      .from('parametric_claims')
      .select('id', { count: 'exact', head: true })
      .eq('is_flagged', true)
      .is('admin_review_status', null),
    adminSupabase
      .from('parametric_claims')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h),
    adminSupabase
      .from('live_disruption_events')
      .select('event_type, severity_score')
      .gte('created_at', since24h)
      .order('created_at', { ascending: false })
      .limit(50),
    (async () => {
      try {
        return await adminSupabase
          .from('rider_delivery_reports')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since24h);
      } catch {
        return { data: null, count: 0 };
      }
    })(),
  ]);

  const policies30d = policies30dRes.data ?? [];
  const claims30d = claims30dRes.data ?? [];
  const fraudPending = fraudPendingRes.count ?? 0;
  const events = eventsRes.data ?? [];
  const severeEvents = events.filter(
    (e: { severity_score: number }) => Number(e.severity_score) >= 8,
  );
  const reportsLast24h = reportsRes.count ?? 0;
  const claimsLast24h = recentClaimsRes.count ?? 0;

  const totalPremiums30d = policies30d.reduce(
    (s: number, p: { weekly_premium_inr: unknown }) => s + Number(p.weekly_premium_inr),
    0,
  );
  const totalPayouts30d = claims30d.reduce(
    (s: number, c: { payout_amount_inr: unknown }) => s + Number(c.payout_amount_inr),
    0,
  );
  const lossRatio =
    totalPremiums30d > 0
      ? ((totalPayouts30d / totalPremiums30d) * 100).toFixed(1)
      : '0';

  const topTriggerEntry = Object.entries(
    events.reduce<Record<string, number>>((acc, event: { event_type: string }) => {
      const key = event.event_type || 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0];

  const headline =
    fraudPending > 0 || reportsLast24h > 0 || severeEvents.length > 0
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
  if (severeEvents.length > 0) {
    summaryParts.push(
      `${severeEvents.length} severe trigger${severeEvents.length === 1 ? '' : 's'} fired today`,
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

  return NextResponse.json({
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
        value: String(severeEvents.length),
        note:
          severeEvents.length > 0
            ? 'High-severity disruption events detected today'
            : 'No severe disruptions detected today',
        href: '/admin/triggers',
        tone: severeEvents.length > 0 ? 'violet' : 'cyan',
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
  });
});
