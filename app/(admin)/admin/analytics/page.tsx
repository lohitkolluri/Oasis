import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const AnalyticsCharts = dynamic(
  () => import('@/components/admin/AnalyticsCharts').then((m) => m.AnalyticsCharts),
  {
    loading: () => (
      <div className="h-96 rounded-2xl bg-[#161616]/80 border border-[#2d2d2d] animate-pulse" />
    ),
  },
);

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 py-2">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-white transition-colors group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </Link>

      <div>
        <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.15em] mb-1">
          Admin Console
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Analytics</h1>
        <p className="text-sm text-[#666666] mt-1">
          Claims, premiums, loss ratio, and trigger distribution. Last 30 days
        </p>
      </div>

      <AnalyticsCharts />
    </div>
  );
}
