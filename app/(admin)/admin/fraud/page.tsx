import { FraudList } from '@/components/admin/FraudList';
import { KPICard } from '@/components/ui/KPICard';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function FraudPage() {
  const supabase = createAdminClient();

  const { data: claims } = await supabase
    .from('parametric_claims')
    .select(
      `
      id,
      payout_amount_inr,
      is_flagged,
      flag_reason,
      created_at,
      admin_review_status,
      reviewed_by,
      weekly_policies(profile_id)
    `,
    )
    .eq('is_flagged', true)
    .order('created_at', { ascending: false });

  const pendingCount = (claims ?? []).filter((c) => !c.admin_review_status).length;
  const reviewedCount = (claims ?? []).filter((c) => c.admin_review_status).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Fraud Queue</h1>
        <p className="text-sm text-[#666] mt-1">
          Claims flagged by duplicate, rapid-claims, weather mismatch, or GPS verification
        </p>
      </div>

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

      <FraudList claims={claims ?? []} />
    </div>
  );
}
