import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
import { FraudList } from '@/components/admin/FraudList';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
import { ShieldAlert } from 'lucide-react';

export default async function FraudPage() {
  const supabase = createAdminClient();

  const { data: claims } = await supabase
    .from('parametric_claims')
    .select(
      `
      id,
      policy_id,
      payout_amount_inr,
      is_flagged,
      flag_reason,
      created_at,
      admin_review_status,
      reviewed_by,
      weekly_policies(
        profile_id,
        plan_packages(payout_per_claim_inr)
      )
    `,
    )
    .or('is_flagged.eq.true,admin_review_status.in.(approved,rejected)')
    .order('created_at', { ascending: false });

  const pendingCount = (claims ?? []).filter((c) => !c.admin_review_status).length;
  const reviewedCount = (claims ?? []).filter((c) => c.admin_review_status).length;

  return (
    <div className="space-y-6">
      <AdminPageTitle
        title="Fraud Queue"
        help="Parametric claims that automated rules flagged (e.g. rapid repeats, GPS anomalies) or that already have an admin decision (approved/rejected). Approve or reject after review — product scope is loss of income from external disruptions, not injury or vehicle damage."
        description="Claims flagged by duplicate, rapid-claims, weather mismatch, or GPS verification"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KPICard
          title="Pending"
          label={pendingCount > 0 ? 'Needs review' : 'All clear'}
          value={pendingCount}
          accent={pendingCount > 0 ? 'amber' : 'emerald'}
        />
        <KPICard title="Reviewed" label="Processed" value={reviewedCount} accent="cyan" />
        <KPICard
          title="Total Flagged"
          label="All time"
          value={claims?.length ?? 0}
          accent="violet"
        />
      </div>

      <Card variant="default" padding="none">
        {(claims ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <ShieldAlert className="h-10 w-10 text-[#3a3a3a] mb-4 stroke-[1.5]" />
            <p className="text-sm font-medium text-[#555]">No claims in queue</p>
            <p className="text-xs text-[#444] mt-1">
              Flagged claims will appear here for review
            </p>
          </div>
        ) : (
          <FraudList claims={claims ?? []} />
        )}
      </Card>
    </div>
  );
}
