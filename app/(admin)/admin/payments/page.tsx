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
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
};

export default async function AdminPaymentsPage() {
  const supabase = createAdminClient();

  const { data: payments } = await supabase
    .from('payment_transactions')
    .select(
      'id, profile_id, weekly_policy_id, amount_inr, status, razorpay_order_id, razorpay_payment_id, paid_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  const rows =
    (payments as DbPayment[] | null)?.map((p) => {
      const hasRazorpayRef = Boolean(p.razorpay_payment_id?.trim());
      const hasIssue =
        p.status === 'paid' && !hasRazorpayRef;
      return {
        id: p.id,
        status: p.status,
        amountInr: Number(p.amount_inr),
        profileId: p.profile_id,
        weeklyPolicyId: p.weekly_policy_id,
        razorpayOrderId: p.razorpay_order_id,
        razorpayPaymentId: p.razorpay_payment_id,
        createdAt: p.created_at,
        paidAt: p.paid_at,
        hasIssue,
      };
    }) ?? [];

  const totalCollected = rows.reduce((s, r) => s + r.amountInr, 0);
  const withPaymentIdCount = rows.filter((r) => !!r.razorpayPaymentId).length;
  const paidCount = rows.filter((r) => r.status === 'paid').length;
  const issueCount = rows.filter((r) => r.hasIssue).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Payment Logs
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Premium collections — order and payment IDs match Razorpay for audit
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
          title="Linked payments"
          label="With Razorpay payment id"
          value={
            rows.length > 0
              ? `${Math.round((withPaymentIdCount / rows.length) * 100)}%`
              : '—'
          }
          accent={withPaymentIdCount > 0 ? 'violet' : 'blue'}
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
          <PaymentTransactionsTable rows={rows} issueCount={issueCount} />
        )}
      </Card>
    </div>
  );
}
