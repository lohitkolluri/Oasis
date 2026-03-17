'use client';

import dynamic from 'next/dynamic';

const ProductPreviewTabs = dynamic(
  () => import('@/components/landing/ProductPreviewTabs').then((m) => m.ProductPreviewTabs),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <div className="h-9 w-48 rounded-xl bg-white/[0.05] animate-pulse" />
        <div className="mt-4 h-[520px] w-full rounded-3xl bg-black/20 border border-white/10 animate-pulse" />
      </div>
    ),
  },
);

export function ProductPreviewTabsLazy() {
  return <ProductPreviewTabs />;
}

