import dynamic from 'next/dynamic';
import { RunAdjudicatorButton } from '@/components/admin/RunAdjudicatorButton';

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Overview</h1>
          <p className="text-sm text-[#666] mt-1">
            Claims, premiums, loss ratio, and triggers. Last 30 days
          </p>
        </div>
        <RunAdjudicatorButton />
      </div>

      <AnalyticsCharts />
    </div>
  );
}
