import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
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

  const paidRows = rows.filter((r) => r.status === 'paid');
  const totalCollected = paidRows.reduce((s, r) => s + r.amountInr, 0);
  const paidWithRazorpayIdCount = paidRows.filter((r) => !!r.razorpayPaymentId).length;
  const paidCount = paidRows.length;
  const issueCount = rows.filter((r) => r.hasIssue).length;

  return (
    <div className="space-y-6">
      <AdminPageTitle
        title="Payment Logs"
        help="Checkout and charge attempts for weekly premiums (Razorpay). Paid rows should carry a Razorpay payment id for reconciliation. Flags highlight paid rows missing an id. Weekly billing only — no monthly or annual products."
        description="Premium collections: order and payment IDs match Razorpay for audit"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard
          title="Total Collected"
          label={`Paid only · ${rows.length} rows loaded`}
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
          label="Paid rows with Razorpay payment id"
          value={
            paidCount > 0
              ? `${Math.round((paidWithRazorpayIdCount / paidCount) * 100)}%`
              : '—'
          }
          accent={paidWithRazorpayIdCount > 0 ? 'violet' : 'blue'}
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
