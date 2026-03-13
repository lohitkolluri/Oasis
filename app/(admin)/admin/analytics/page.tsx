import dynamic from 'next/dynamic';

const AnalyticsCharts = dynamic(
  () => import('@/components/admin/AnalyticsCharts').then((m) => m.AnalyticsCharts),
  {
    loading: () => (
      <div className="h-96 rounded-xl bg-[#161616] border border-[#2d2d2d] animate-pulse" />
    ),
  },
);

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Analytics</h1>
        <p className="text-sm text-[#666] mt-1">
          Claims, premiums, loss ratio, and trigger distribution. Last 30 days
        </p>
      </div>

      <AnalyticsCharts />
    </div>
  );
}
