'use client';

import dynamic from 'next/dynamic';

const AdminPreviewFrame = dynamic(
  () => import('@/components/landing/AdminPreviewFrame').then((m) => m.AdminPreviewFrame),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl border border-[#2d2d2d] bg-[#161616] h-[520px] w-full animate-pulse" />
    ),
  },
);

const AdminMiniDashboard = dynamic(
  () => import('@/components/landing/AdminMiniDashboard').then((m) => m.AdminMiniDashboard),
  {
    ssr: false,
    loading: () => null,
  },
);

export function HeroDashboardPreviewLazy({
  variant = 'primary',
}: {
  variant?: 'primary' | 'subtle';
}) {
  // Hero-only: keep a single, wide product shot.
  return (
    <div className="relative">
      <div className="rounded-[28px] border border-[#2d2d2d] bg-[#101010] p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_34px_90px_rgba(0,0,0,0.65)]">
        <div className="rounded-3xl overflow-hidden">
          <AdminPreviewFrame>
            <div className="scale-[0.97] origin-top-left w-[103%]">
              <AdminMiniDashboard />
            </div>
          </AdminPreviewFrame>
        </div>
      </div>
    </div>
  );
}

