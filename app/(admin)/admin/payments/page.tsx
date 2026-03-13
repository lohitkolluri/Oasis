import { KPICard } from '@/components/ui/KPICard';
import { createAdminClient } from '@/lib/supabase/admin';

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

  const stripeIntentsAvailable = intentsById.size > 0;

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

  const totalCollected = rows.reduce((s, r) => s + Number(r.db.amount_inr), 0);
  const withStripeIdCount = rows.filter((r) => !!r.db.stripe_payment_intent_id).length;
  const paidCount = rows.filter((r) => r.db.status === 'paid').length;

  const mismatchCount = stripeIntentsAvailable
    ? rows.filter(
        (r) =>
          (r.db.stripe_payment_intent_id && !r.intent) ||
          r.amountMatch === false ||
          (r.intent && r.db.status === 'paid' && r.intent.status !== 'succeeded'),
      ).length
    : 0;

  const reconciliationRate =
    stripeIntentsAvailable && rows.length > 0
      ? (((rows.length - mismatchCount) / rows.length) * 100).toFixed(1)
      : null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Payment Logs</h1>
        <p className="text-sm text-[#666] mt-1">
          Recent premium payments recorded by Oasis
          {stripeIntentsAvailable ? (
            <span className="text-[#555]"> · Stripe intents available for reconciliation</span>
          ) : (
            <span className="text-[#555]">
              {' '}
              · Stripe intents not available (showing Oasis logs only)
            </span>
          )}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard
          title="Total Collected"
          label={`Last ${rows.length} transactions`}
          value={`₹${totalCollected.toLocaleString('en-IN')}`}
          accent="cyan"
        />
        {stripeIntentsAvailable ? (
          <>
            <KPICard
              title="Mismatches"
              label="Amount or status"
              value={mismatchCount}
              accent={mismatchCount > 0 ? 'amber' : 'emerald'}
            />
            <KPICard
              title="Reconciliation"
              label="Match rate"
              value={`${reconciliationRate ?? '—'}%`}
              accent={reconciliationRate != null && Number(reconciliationRate) < 95 ? 'amber' : 'emerald'}
            />
          </>
        ) : (
          <>
            <KPICard title="Paid" label="Count" value={paidCount} accent="emerald" />
            <KPICard
              title="With Stripe PI"
              label="Recorded IDs"
              value={withStripeIdCount}
              accent={withStripeIdCount > 0 ? 'violet' : 'blue'}
            />
          </>
        )}
      </div>

      {/* Payments table */}
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2d2d2d] flex items-center justify-between">
          <p className="text-xs font-semibold text-white">
            Recent payments
            <span className="text-[#555] font-normal ml-2">Last {rows.length} transactions</span>
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#555]">
            No payment transactions found yet.
          </div>
        ) : (
          <>
            <div
              className={`px-5 py-2.5 border-b border-[#2d2d2d] grid gap-4 ${
                stripeIntentsAvailable
                  ? 'grid-cols-[1.2fr_auto_auto_auto_auto]'
                  : 'grid-cols-[1.2fr_auto_auto_auto]'
              }`}
            >
              {(
                stripeIntentsAvailable
                  ? ['Status', 'Amount', 'Policy', 'Stripe', 'Date']
                  : ['Status', 'Amount', 'Policy', 'Date']
              ).map((h) => (
                <span
                  key={h}
                  className={`text-[10px] font-medium text-[#555] uppercase tracking-[0.1em] ${
                    h === 'Status' ? '' : 'text-center'
                  }`}
                >
                  {h}
                </span>
              ))}
            </div>
            <div className="divide-y divide-[#262626]">
              {rows.map(({ db, intent, amountMatch }) => {
                const hasStripeId = !!db.stripe_payment_intent_id;
                const statusMismatch =
                  stripeIntentsAvailable && intent && db.status === 'paid'
                    ? intent.status !== 'succeeded'
                    : false;
                const hasIssue =
                  stripeIntentsAvailable &&
                  (amountMatch === false || statusMismatch || (hasStripeId && !intent));

                return (
                  <div
                    key={db.id}
                    className={`px-5 py-3 grid gap-4 items-center text-xs hover:bg-[#1e1e1e] transition-colors ${
                      stripeIntentsAvailable
                        ? 'grid-cols-[1.2fr_auto_auto_auto_auto]'
                        : 'grid-cols-[1.2fr_auto_auto_auto]'
                    }`}
                  >
                    {/* Status badges */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 border border-[#2d2d2d] bg-[#111] text-[10px] text-[#9ca3af]">
                        {db.status}
                      </span>
                      {stripeIntentsAvailable && intent && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 border border-[#2d2d2d] bg-[#050816] text-[10px] text-[#7dd3fc]">
                          {intent.status ?? 'unknown'}
                        </span>
                      )}
                      {hasIssue && (
                        <span className="text-[10px] text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/30 rounded-full px-2 py-0.5">
                          {amountMatch === false
                            ? 'Amount mismatch'
                            : statusMismatch
                              ? 'Status mismatch'
                              : 'No Stripe match'}
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    <span className="font-mono text-[11px] text-white tabular-nums whitespace-nowrap text-center">
                      ₹{Number(db.amount_inr).toLocaleString('en-IN')}
                    </span>

                    {/* Policy ID */}
                    <span className="text-[10px] text-[#555] font-mono whitespace-nowrap text-center">
                      {db.weekly_policy_id ? db.weekly_policy_id.slice(0, 8) + '...' : '—'}
                    </span>

                    {stripeIntentsAvailable && (
                      <span className="text-[10px] text-[#555] font-mono whitespace-nowrap text-center">
                        {db.stripe_payment_intent_id
                          ? db.stripe_payment_intent_id.slice(0, 12) + '...'
                          : '—'}
                      </span>
                    )}

                    {/* Date */}
                    <span className="text-[10px] text-[#555] whitespace-nowrap tabular-nums text-center">
                      {formatDate(db.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
