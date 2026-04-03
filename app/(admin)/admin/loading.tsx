'use client';

import { Skeleton } from '@/components/ui/skeleton';

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] px-4 py-5">
      <Skeleton className="h-2.5 w-24 bg-[#262626]" />
      <Skeleton className="mt-3 h-7 w-20 bg-[#262626]" />
      <Skeleton className="mt-3 h-3 w-32 bg-[#1f1f1f]" />
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title strip */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36 bg-[#1e1e1e]" />
          <Skeleton className="h-4 w-[min(520px,70vw)] bg-[#161616]" />
        </div>
        <Skeleton className="h-8 w-40 rounded-lg bg-[#1e1e1e]" />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Main chart surface */}
      <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] p-5">
        <Skeleton className="h-3 w-28 bg-[#262626]" />
        <Skeleton className="mt-3 h-[320px] w-full rounded-xl bg-[#111111]" />
      </div>

      {/* Secondary charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] p-5">
          <Skeleton className="h-3 w-24 bg-[#262626]" />
          <Skeleton className="mt-3 h-[220px] w-full rounded-xl bg-[#111111]" />
        </div>
        <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] p-5">
          <Skeleton className="h-3 w-24 bg-[#262626]" />
          <Skeleton className="mt-3 h-[220px] w-full rounded-xl bg-[#111111]" />
        </div>
      </div>
    </div>
  );
}

