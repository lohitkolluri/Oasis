import { RiderSk } from '@/components/rider/RiderSkeleton';

export default function PolicyLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading policy">
      <RiderSk className="h-4 w-28 rounded-md" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <RiderSk className="h-7 w-48 max-w-full rounded-lg" />
          <RiderSk className="h-4 w-64 max-w-full rounded-md" />
        </div>
        <RiderSk className="h-11 w-28 shrink-0 rounded-xl" />
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-surface-1 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <RiderSk className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <RiderSk className="h-4 w-36 rounded" />
            <RiderSk className="h-3 w-52 max-w-full rounded" />
          </div>
        </div>
        <RiderSk className="h-px w-full rounded-none opacity-50" />
        <div className="grid gap-3 sm:grid-cols-2">
          <RiderSk className="h-24 w-full rounded-xl" />
          <RiderSk className="h-24 w-full rounded-xl" />
        </div>
        <RiderSk className="h-12 w-full rounded-xl" />
        <RiderSk className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
