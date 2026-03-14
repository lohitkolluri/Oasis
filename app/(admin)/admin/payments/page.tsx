import { CopyableId } from '@/components/ui/CopyableId';
import { KPICard } from '@/components/ui/KPICard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
              accent={
                reconciliationRate != null && Number(reconciliationRate) < 95
                  ? 'amber'
                  : 'emerald'
              }
            />
          </>
        ) : (
          <>
            <KPICard
              title="Paid"
              label="Count"
              value={paidCount}
              accent="emerald"
            />
            <KPICard
              title="With Stripe PI"
              label="Recorded IDs"
              value={withStripeIdCount}
              accent={withStripeIdCount > 0 ? 'violet' : 'blue'}
            />
          </>
        )}
      </div>

      <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] overflow-hidden">
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
          <>
            <div className="border-b border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                Recent payments
              </p>
              <span className="text-[11px] text-[#555] tabular-nums">
                Last {rows.length} transactions
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                  <TableHead className="w-[min(200px,25%)]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">
                    Amount
                  </TableHead>
                  <TableHead className="w-[100px]">Policy</TableHead>
                  {stripeIntentsAvailable && (
                    <TableHead className="w-[120px]">Stripe</TableHead>
                  )}
                  <TableHead className="w-[120px] text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ db, intent, amountMatch }) => {
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

                  return (
                    <TableRow key={db.id} className="border-[#2d2d2d]">
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-[#2d2d2d] bg-[#1e1e1e] px-2 py-0.5 text-[10px] font-medium text-[#9ca3af]">
                            {db.status}
                          </span>
                          {stripeIntentsAvailable && intent && (
                            <span className="inline-flex items-center rounded-full border border-[#7dd3fc]/20 bg-[#7dd3fc]/10 px-2 py-0.5 text-[10px] font-medium text-[#7dd3fc]">
                              {intent.status ?? 'unknown'}
                            </span>
                          )}
                          {hasIssue && (
                            <span className="inline-flex items-center rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-2 py-0.5 text-[10px] font-medium text-[#f97316]">
                              {amountMatch === false
                                ? 'Amount mismatch'
                                : statusMismatch
                                  ? 'Status mismatch'
                                  : 'No Stripe match'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-white">
                        ₹{Number(db.amount_inr).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {db.weekly_policy_id ? (
                          <CopyableId
                            value={db.weekly_policy_id}
                            prefix=""
                            length={8}
                            label="Copy policy ID"
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      {stripeIntentsAvailable && (
                        <TableCell>
                          {db.stripe_payment_intent_id ? (
                            <CopyableId
                              value={db.stripe_payment_intent_id}
                              prefix=""
                              length={12}
                              label="Copy Stripe payment intent ID"
                            />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums">
                        {formatDate(db.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </div>
  );
}
