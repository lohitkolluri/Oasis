import { RiderSk } from '@/components/rider/RiderSkeleton';

export default function ClaimsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading claims">
      <RiderSk className="h-4 w-16 rounded-md" />

      <div>
        <RiderSk className="h-7 w-40 max-w-full rounded-lg" />
        <RiderSk className="mt-1.5 h-3 w-52 max-w-full rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex min-h-[120px] flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4"
          >
            <RiderSk className="h-4 w-20 rounded" />
            <RiderSk className="mt-1 h-3 w-14 rounded" />
            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              <RiderSk className="h-6 w-16 rounded" />
              <RiderSk className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-1">
        <div className="border-b border-white/10 px-5 py-3.5">
          <RiderSk className="h-3 w-20 rounded" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3.5 border-b border-white/10 px-5 py-4 last:border-0"
          >
            <RiderSk className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <RiderSk className="h-4 w-24 rounded" />
              <RiderSk className="h-3 w-36 max-w-full rounded" />
              <RiderSk className="h-3 w-28 max-w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
