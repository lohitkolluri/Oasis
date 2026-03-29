import { RiderSk } from '@/components/rider/RiderSkeleton';

export default function WalletLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading wallet">
      <RiderSk className="h-4 w-36 rounded-md" />

      <div>
        <RiderSk className="h-7 w-44 max-w-full rounded-lg" />
        <RiderSk className="mt-1.5 h-4 w-56 max-w-full rounded-md" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] px-4 pt-4 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <RiderSk className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <RiderSk className="h-3 w-20 rounded" />
              <RiderSk className="h-8 w-32 rounded-lg" />
            </div>
          </div>
          <RiderSk className="h-9 w-20 rounded-full" />
        </div>
        <RiderSk className="mt-2 h-3 w-40 rounded" />
        <RiderSk className="mt-2.5 h-7 w-full rounded-lg" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c]">
        <div className="grid grid-cols-3 gap-px bg-white/5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex min-h-[84px] flex-col items-center justify-center bg-[#0c0c0c] p-3.5">
              <RiderSk className="h-3 w-16 rounded" />
              <RiderSk className="mt-2 h-6 w-14 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0c0c0c] py-4 px-2"
          >
            <RiderSk className="h-11 w-11 rounded-xl" />
            <RiderSk className="h-3 w-12 rounded" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-1">
        <div className="border-b border-white/10 px-4 py-3">
          <RiderSk className="h-4 w-32 rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-white/10 px-4 py-3 last:border-0">
            <RiderSk className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <RiderSk className="h-3.5 w-28 rounded" />
              <RiderSk className="h-3 w-20 rounded" />
            </div>
            <RiderSk className="h-5 w-16 shrink-0 rounded-md" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-1">
        <div className="flex items-center justify-between px-4 pb-1.5 pt-4">
          <RiderSk className="h-4 w-36 rounded" />
          <RiderSk className="h-4 w-16 rounded" />
        </div>
        <div className="px-3 pb-3">
          <RiderSk className="h-[160px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
