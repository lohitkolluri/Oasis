import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
import { FraudList } from '@/components/admin/FraudList';
import { SharedPayoutDestinationsCard } from '@/components/admin/SharedPayoutDestinationsCard';
import { Card } from '@/components/ui/Card';
import { KPICard } from '@/components/ui/KPICard';
import { listSharedPayoutDestinations } from '@/lib/admin/fraud-connections-summary';
import { createAdminClient } from '@/lib/supabase/admin';
import { ShieldAlert } from 'lucide-react';

export default async function FraudPage() {
  const supabase = createAdminClient();

  // Only surface flagged or recently-reviewed claims in a bounded window to avoid
  // pulling every historical row on each page load.
  const FRAUD_QUEUE_WINDOW_DAYS = 90;
  const FRAUD_QUEUE_ROW_LIMIT = 500;
  const fraudSince = new Date(
    Date.now() - FRAUD_QUEUE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: claims } = await supabase
    .from('parametric_claims')
    .select(
      `
      id,
      policy_id,
      payout_amount_inr,
      is_flagged,
      flag_reason,
      fraud_risk_score,
      fraud_risk_tier,
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
    .gte('created_at', fraudSince)
    .order('created_at', { ascending: false })
    .limit(FRAUD_QUEUE_ROW_LIMIT);

  const queueRows = (claims ?? []) as Array<{ admin_review_status?: string | null }>;
  const pendingCount = queueRows.filter((c) => !c.admin_review_status).length;
  const reviewedCount = queueRows.filter((c) => !!c.admin_review_status).length;

  let sharedPayoutRows: Awaited<ReturnType<typeof listSharedPayoutDestinations>> = [];
  try {
    sharedPayoutRows = await listSharedPayoutDestinations(supabase);
  } catch (err) {
    // Surface to server logs rather than silently hiding potential fraud signals.
    console.error('[admin/fraud] listSharedPayoutDestinations failed', err);
    sharedPayoutRows = [];
  }

  return (
    <div className="space-y-6">
      <AdminPageTitle
        title="Fraud Queue"
        help="Parametric claims that automated rules flagged (e.g. rapid repeats, GPS anomalies) or that already have an admin decision (approved/rejected). Approve or reject after review — product scope is loss of income from external disruptions, not injury or vehicle damage."
        description="Claims flagged by duplicate, rapid-claims, weather mismatch, GPS verification, or payout routing. Risk score reflects weighted extended checks."
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

      <SharedPayoutDestinationsCard rows={sharedPayoutRows} />

      <Card variant="default" padding="none">
        {(claims ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <ShieldAlert className="h-10 w-10 text-[#3a3a3a] mb-4 stroke-[1.5]" />
            <p className="text-sm font-medium text-[#555]">No claims in queue</p>
            <p className="text-xs text-[#444] mt-1">Flagged claims will appear here for review</p>
          </div>
        ) : (
          <FraudList claims={claims ?? []} />
        )}
      </Card>
    </div>
  );
}
