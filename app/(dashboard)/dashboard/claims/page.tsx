import { RealtimeClaimsList } from '@/components/rider/RealtimeClaimsList';
import { RealtimeProvider } from '@/components/rider/RealtimeProvider';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Calendar, Clock, FileCheck, Wallet } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ClaimsHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: policies } = await supabase
    .from('weekly_policies')
    .select('id, week_start_date, week_end_date, plan_packages(name)')
    .eq('profile_id', user.id)
    .order('week_start_date', { ascending: false })
    .limit(52);

  const policyIds = (policies ?? []).map((p) => p.id);

  const { data: claims } = await supabase
    .from('parametric_claims')
    .select(
      `
      id,
      payout_amount_inr,
      status,
      is_flagged,
      flag_reason,
      created_at,
      policy_id,
      disruption_event_id,
      live_disruption_events(event_type, severity_score, created_at)
    `,
    )
    .in('policy_id', policyIds.length > 0 ? policyIds : ['none'])
    .order('created_at', { ascending: false })
    .limit(50);

  const claimIds = (claims ?? []).map((c) => c.id);
  const ledgerByClaimId: Record<
    string,
    {
      id: string;
      mock_upi_ref: string | null;
      completed_at: string | null;
      amount_inr: number | null;
    }
  > = {};

  if (claimIds.length > 0) {
    const { data: ledgerRows } = await supabase
      .from('payout_ledger')
      .select('claim_id, id, mock_upi_ref, completed_at, amount_inr')
      .in('claim_id', claimIds)
      .order('completed_at', { ascending: false });

    for (const row of ledgerRows ?? []) {
      const cid = row.claim_id as string;
      if (!ledgerByClaimId[cid]) {
        ledgerByClaimId[cid] = {
          id: row.id as string,
          mock_upi_ref: row.mock_upi_ref as string | null,
          completed_at: row.completed_at as string | null,
          amount_inr: row.amount_inr != null ? Number(row.amount_inr) : null,
        };
      }
    }
  }

  const policyMap = Object.fromEntries(
    (policies ?? []).map((p) => [
      p.id,
      {
        weekStart: p.week_start_date,
        weekEnd: p.week_end_date,
        planName: (p.plan_packages as { name?: string } | null)?.name ?? 'Plan',
      },
    ]),
  );

  const totalPaid = (claims ?? [])
    .filter((c) => c.status === 'paid' && !c.is_flagged)
    .reduce((s, c) => s + Number(c.payout_amount_inr), 0);

  const claimCount = claims?.length ?? 0;
  const policyCount = policies?.length ?? 0;

  return (
    <RealtimeProvider profileId={user.id} policyIds={policyIds}>
      <div className="space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 active:text-zinc-200 transition-colors min-h-[44px] -ml-1 px-1"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to dashboard
        </Link>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Payout history</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Automated income protection when external disruptions hit your zone — not health,
            accident, or vehicle cover.
          </p>
        </div>

        <Card
          variant="default"
          padding="none"
          className="rounded-2xl border-white/10 bg-surface-1 overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            <div className="flex flex-1 items-center gap-3 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#276EF1]/20 border border-[#276EF1]/30">
                <FileCheck className="h-5 w-5 text-[#276EF1]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Total
                </p>
                <p className="text-lg font-bold tabular-nums text-white">{claimCount}</p>
                <p className="text-[11px] text-zinc-500">Payout events</p>
              </div>
            </div>
            <div
              className="h-px w-full bg-white/10 sm:h-auto sm:w-px sm:min-h-[60px]"
              aria-hidden
            />
            <div className="flex flex-1 items-center gap-3 px-5 py-4 border-t border-white/10 sm:border-t-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3AA76D]/20 border border-[#3AA76D]/30">
                <Wallet className="h-5 w-5 text-[#3AA76D]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Paid out
                </p>
                <p className="text-lg font-bold tabular-nums text-white">
                  ₹{totalPaid.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-zinc-500">Amount</p>
              </div>
            </div>
            <div
              className="h-px w-full bg-white/10 sm:h-auto sm:w-px sm:min-h-[60px]"
              aria-hidden
            />
            <div className="flex flex-1 items-center gap-3 px-5 py-4 border-t border-white/10 sm:border-t-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7356BF]/20 border border-[#7356BF]/30">
                <Calendar className="h-5 w-5 text-[#7356BF]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Policies
                </p>
                <p className="text-lg font-bold tabular-nums text-white">{policyCount}</p>
                <p className="text-[11px] text-zinc-500">Coverage weeks</p>
              </div>
            </div>
          </div>
        </Card>

        {!claims || claims.length === 0 ? (
          <Card
            variant="default"
            padding="lg"
            className="rounded-2xl border-white/10 bg-surface-1 text-center"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/5 border border-white/10 mx-auto mb-4">
              <Clock className="h-6 w-6 text-zinc-500" />
            </div>
            <p className="text-sm font-semibold text-zinc-300">No claims yet</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Claims appear automatically when a disruption is detected in your zone.
            </p>
          </Card>
        ) : (
          <RealtimeClaimsList
            claims={claims}
            policyMap={policyMap}
            ledgerByClaimId={ledgerByClaimId}
          />
        )}

        <p className="text-center text-[12px] text-zinc-500 leading-relaxed pt-2">
          Need help with a payout?{' '}
          <a
            href="mailto:lohitkolluri@gmail.com?subject=Oasis%20payout%20help"
            className="text-zinc-300 underline underline-offset-2 hover:text-white"
          >
            Email support
          </a>
          {' · '}
          <a
            href="https://oasisdocs.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 underline underline-offset-2 hover:text-white"
          >
            How triggers work
          </a>
        </p>
      </div>
    </RealtimeProvider>
  );
}
