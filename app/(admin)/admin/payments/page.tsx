import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft, CreditCard, RefreshCw } from 'lucide-react';
import Link from 'next/link';

type DbPayment = {
  id: string;
  profile_id: string;
  weekly_policy_id: string | null;
  amount_inr: number;
  status: string;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
};

type StripeIntent = {
  id: string;
  amount: number;
  currency: string | null;
  status: string | null;
  created: number;
};

export default async function AdminPaymentsPage() {
  const supabase = createAdminClient();

  const { data: payments } = await supabase
    .from('payment_transactions')
    .select(
      'id, profile_id, weekly_policy_id, amount_inr, status, stripe_payment_intent_id, paid_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  const intentsById = new Map<string, StripeIntent>();

  const intentIds = Array.from(
    new Set(
      (payments ?? [])
        .map((p) => p.stripe_payment_intent_id)
        .filter((id): id is string => !!id),
    ),
  );

  if (intentIds.length > 0) {
    const { data: stripeIntents } = await supabase
      .from('stripe.payment_intents' as never)
      .select('id, amount, currency, status, created')
      .in('id', intentIds);

    for (const row of (stripeIntents ?? []) as StripeIntent[]) {
      intentsById.set(row.id, row);
    }
  }

  const rows =
    (payments as DbPayment[] | null)?.map((p) => {
      const intent = p.stripe_payment_intent_id
        ? intentsById.get(p.stripe_payment_intent_id)
        : undefined;
      const dbAmountPaise = Math.round(Number(p.amount_inr) * 100);
      const stripeAmount = intent?.amount ?? null;

      const amountMatch =
        stripeAmount != null ? stripeAmount === dbAmountPaise : null;

      return {
        db: p,
        intent,
        amountMatch,
      };
    }) ?? [];

  return (
    <div className="space-y-8 py-2">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-white transition-colors group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </Link>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.15em] mb-1">
            Admin Console
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Payments & Reconciliation
          </h1>
          <p className="text-sm text-[#666666] mt-1">
            Compare Oasis payment records with synced Stripe payment intents.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#666666]">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Stripe data synced via Stripe Sync Engine</span>
        </div>
      </div>

      <div className="rounded-2xl bg-[#161616] border border-[#2d2d2d] overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between border-b border-[#2d2d2d]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5 text-[#7dd3fc]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Recent payments</p>
              <p className="text-[10px] text-[#666666]">
                Last {rows.length} payment_transactions with Stripe intents
              </p>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#666666]">
            No payment transactions found yet.
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {rows.map(({ db, intent, amountMatch }) => {
              const statusMismatch =
                intent && db.status === 'paid'
                  ? intent.status !== 'succeeded'
                  : false;

              return (
                <div
                  key={db.id}
                  className="px-5 py-3.5 flex items-start gap-3 text-xs text-[#9ca3af]"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-[#2d2d2d] bg-[#111111] text-[10px] text-[#9ca3af]">
                          Oasis · {db.status}
                        </span>
                        {intent && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-[#2d2d2d] bg-[#050816] text-[10px] text-[#7dd3fc]">
                            Stripe · {intent.status ?? 'unknown'}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-[#9ca3af]">
                        ₹{Number(db.amount_inr).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#666666]">
                        Policy:{' '}
                        <span className="font-mono text-[#9ca3af]">
                          {db.weekly_policy_id
                            ? db.weekly_policy_id.slice(0, 8) + '…'
                            : '—'}
                        </span>
                      </span>
                      {db.stripe_payment_intent_id && (
                        <span className="text-[10px] text-[#666666]">
                          PI:{' '}
                          <span className="font-mono text-[#9ca3af]">
                            {db.stripe_payment_intent_id}
                          </span>
                        </span>
                      )}
                      {intent && (
                        <span className="text-[10px] text-[#666666]">
                          Stripe amount:{' '}
                          <span className="font-mono text-[#9ca3af]">
                            {intent.amount / 100}{' '}
                            {(intent.currency ?? 'inr').toUpperCase()}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {amountMatch === false && (
                        <span className="text-[10px] text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/30 rounded-full px-2 py-0.5">
                          Amount mismatch
                        </span>
                      )}
                      {statusMismatch && (
                        <span className="text-[10px] text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/30 rounded-full px-2 py-0.5">
                          Paid in Oasis, not succeeded in Stripe
                        </span>
                      )}
                      {!intent && (
                        <span className="text-[10px] text-[#facc15] bg-[#facc15]/10 border border-[#facc15]/30 rounded-full px-2 py-0.5">
                          No matching Stripe payment_intent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

