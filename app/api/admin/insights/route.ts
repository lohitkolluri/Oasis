/**
 * Deterministic admin operations brief.
 * Admin-only.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_ctx) => {
  const adminSupabase = createAdminClient();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [policiesRes, claimsRes, fraudRes, recentClaimsRes, eventsRes, reportsRes] = await Promise.all([
    adminSupabase.from('weekly_policies').select('weekly_premium_inr').eq('is_active', true),
    adminSupabase.from('parametric_claims').select('payout_amount_inr'),
    adminSupabase
      .from('parametric_claims')
      .select('id', { count: 'exact', head: true })
      .eq('is_flagged', true),
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

  const policies = policiesRes.data ?? [];
  const claims = claimsRes.data ?? [];
  const fraudCount = fraudRes.count ?? 0;
  const events = eventsRes.data ?? [];
  const severeEvents = events.filter((e: { severity_score: number }) => Number(e.severity_score) >= 8);
  const reportsLast24h = reportsRes.count ?? 0;
  const claimsLast24h = recentClaimsRes.count ?? 0;

  const totalPremiums = policies.reduce(
    (s: number, p: { weekly_premium_inr: unknown }) => s + Number(p.weekly_premium_inr),
    0,
  );
  const totalPayouts = claims.reduce(
    (s: number, c: { payout_amount_inr: unknown }) => s + Number(c.payout_amount_inr),
    0,
  );
  const lossRatio = totalPremiums > 0 ? ((totalPayouts / totalPremiums) * 100).toFixed(1) : '0';

  const topTriggerEntry = Object.entries(
    events.reduce<Record<string, number>>((acc, event: { event_type: string }) => {
      const key = event.event_type || 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0];

  const headline =
    fraudCount > 0 || reportsLast24h > 0 || severeEvents.length > 0 ? 'Action needed' : 'Platform stable';

  const summaryParts: string[] = [];
  if (fraudCount > 0) summaryParts.push(`${fraudCount} flagged claim${fraudCount === 1 ? '' : 's'} await review`);
  if (reportsLast24h > 0)
    summaryParts.push(`${reportsLast24h} rider self-report${reportsLast24h === 1 ? '' : 's'} came in over the last 24h`);
  if (severeEvents.length > 0)
    summaryParts.push(`${severeEvents.length} severe trigger${severeEvents.length === 1 ? '' : 's'} fired today`);
  if (summaryParts.length === 0) summaryParts.push('No urgent fraud, self-report, or severe trigger activity detected');

  const watchlist: string[] = [];
  if (topTriggerEntry) {
    watchlist.push(`Top trigger in the last 24h: ${topTriggerEntry[0]} (${topTriggerEntry[1]} event${topTriggerEntry[1] === 1 ? '' : 's'}).`);
  }
  if (Number(lossRatio) > 80) {
    watchlist.push(`Loss ratio is ${lossRatio}%. Review pricing and payout pressure before the next weekly cycle.`);
  }
  if (claimsLast24h > 0) {
    watchlist.push(`${claimsLast24h} claim${claimsLast24h === 1 ? '' : 's'} were created in the last 24h.`);
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
        value: String(fraudCount),
        note: fraudCount > 0 ? 'Claims waiting for manual decision' : 'No flagged claims right now',
        href: '/admin/fraud',
        tone: fraudCount > 0 ? 'red' : 'emerald',
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
        note: `Loss ratio ${lossRatio}% · ₹${totalPayouts.toLocaleString('en-IN')} total payouts`,
        href: '/admin/analytics',
        tone: Number(lossRatio) > 80 ? 'amber' : 'emerald',
      },
    ],
    watchlist,
  });
});
