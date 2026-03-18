'use client';

import dynamic from 'next/dynamic';

export const PlanPricingForecastChartLazy = dynamic(
  () =>
    import('./PlanPricingForecastChart').then((m) => m.PlanPricingForecastChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
        <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
        <div className="mt-3 h-56 rounded-xl bg-white/5 animate-pulse" />
      </div>
    ),
  },
);

