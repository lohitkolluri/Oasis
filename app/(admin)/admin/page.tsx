import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
import { RunAdjudicatorButton } from '@/components/admin/RunAdjudicatorButton';
import dynamic from 'next/dynamic';

const AnalyticsCharts = dynamic(
  () => import('@/components/admin/AnalyticsCharts').then((m) => m.AnalyticsCharts),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="h-96 w-full max-w-4xl rounded-xl bg-[#161616] border border-[#2d2d2d] animate-pulse" />
      </div>
    ),
  },
);

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <AdminPageTitle
        title="Overview"
        help="Portfolio snapshot for roughly the last 30 days: parametric claim volume and payouts, weekly premium booked (paid or demo policies), loss ratio, and live disruption events. Run Adjudicator kicks the server job that evaluates triggers and may create claims — use after config or weather changes."
        description="Claims, premiums, loss ratio, and triggers. Last 30 days"
        actions={<RunAdjudicatorButton />}
      />

      <AnalyticsCharts />
    </div>
  );
}
