'use client';

import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { RiderSk } from '@/components/rider/RiderSkeleton';

export const WeeklyEarningsChartLazy = dynamic(
  () => import('./WeeklyEarningsChart').then((m) => m.WeeklyEarningsChart),
  {
    ssr: false,
    loading: () => (
      <Card
        variant="default"
        padding="none"
        className="rounded-2xl border-white/10 bg-surface-1 overflow-hidden"
      >
        <div className="px-4 pt-4 pb-1.5 flex items-center justify-between">
          <RiderSk className="h-4 w-32 rounded" />
          <RiderSk className="h-4 w-20 rounded" />
        </div>
        <div className="w-full h-[160px] px-3 pb-3">
          <RiderSk className="h-full w-full rounded-xl" />
        </div>
      </Card>
    ),
  },
);

