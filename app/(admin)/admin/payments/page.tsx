import { KPICard } from '@/components/ui/KPICard';
import { PaymentTransactionsTable } from '@/components/admin/PaymentTransactionsTable';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreditCard } from 'lucide-react';

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
  const withStripeIdCount = rows.filter(
    (r) => !!r.db.stripe_payment_intent_id,
  ).length;
  const paidCount = rows.filter((r) => r.db.status === 'paid').length;

  const mismatchCount = stripeIntentsAvailable
    ? rows.filter(
        (r) =>
          (r.db.stripe_payment_intent_id && !r.intent) ||
          r.amountMatch === false ||
          (r.intent &&
            r.db.status === 'paid' &&
            r.intent.status !== 'succeeded'),
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
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Payment Logs
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Recent premium payments recorded by Oasis
          {stripeIntentsAvailable ? (
            <span className="text-[#555]">
              {' '}
              · Stripe intents available for reconciliation
            </span>
          ) : (
            <span className="text-[#555]">
              {' '}
              · Stripe intents not available (showing Oasis logs only)
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard
          title="Total Collected"
          label={`Last ${rows.length} transactions`}
          value={`₹${totalCollected.toLocaleString('en-IN')}`}
          accent="cyan"
        />
        <KPICard
          title="Paid"
          label="Transactions"
          value={paidCount}
          accent="emerald"
        />
        <KPICard
          title="Stripe coverage"
          label="With payment_intent_id"
          value={
            rows.length > 0
              ? `${Math.round((withStripeIdCount / rows.length) * 100)}%`
              : '—'
          }
          accent={withStripeIdCount > 0 ? 'violet' : 'blue'}
        />
      </div>

      <Card variant="default" padding="none">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="h-10 w-10 text-[#3a3a3a] mb-4" />
            <p className="text-sm font-medium text-[#555]">
              No payment transactions yet
            </p>
            <p className="text-xs text-[#444] mt-1">
              Payments will appear here when riders pay for weekly coverage
            </p>
          </div>
        ) : (
          <PaymentTransactionsTable
            rows={rows.map(({ db, intent, amountMatch }) => {
              const hasStripeId = !!db.stripe_payment_intent_id;
              const statusMismatch =
                stripeIntentsAvailable &&
                intent &&
                db.status === 'paid'
                  ? intent.status !== 'succeeded'
                  : false;
              const hasIssue =
                stripeIntentsAvailable &&
                (amountMatch === false ||
                  statusMismatch ||
                  (hasStripeId && !intent));

              return {
                id: db.id,
                status: db.status,
                amountInr: Number(db.amount_inr),
                profileId: db.profile_id,
                weeklyPolicyId: db.weekly_policy_id,
                stripePaymentIntentId: db.stripe_payment_intent_id,
                createdAt: db.created_at,
                paidAt: db.paid_at,
                stripeStatus: intent?.status ?? null,
                amountMatch,
                statusMismatch,
                hasIssue,
              };
            })}
            stripeIntentsAvailable={stripeIntentsAvailable}
          />
        )}
      </Card>
    </div>
  );
}
