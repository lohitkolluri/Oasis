import { RiderSk } from '@/components/rider/RiderSkeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-4" aria-busy="true" aria-label="Loading dashboard">
      {/* Hero: greeting + coverage */}
      <section className="space-y-3">
        <div className="pt-0.5">
          <RiderSk className="h-5 w-48 max-w-full rounded-lg" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-surface-1 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <RiderSk className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <RiderSk className="h-4 w-28 rounded-md" />
                <RiderSk className="h-4 w-16 rounded-full" />
              </div>
              <RiderSk className="h-3 w-40 max-w-full rounded-md" />
            </div>
            <div className="shrink-0 space-y-2 text-right">
              <RiderSk className="ml-auto h-6 w-10 rounded-md" />
              <RiderSk className="ml-auto h-2.5 w-12 rounded-md" />
            </div>
          </div>
          <RiderSk className="mt-3 h-1.5 w-full rounded-full" />
        </div>
      </section>

      {/* Wallet */}
      <section>
        <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] px-4 pt-4 pb-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <RiderSk className="h-11 w-11 rounded-xl" />
              <div className="space-y-2">
                <RiderSk className="h-3 w-20 rounded" />
                <RiderSk className="h-7 w-28 rounded-lg" />
              </div>
            </div>
            <RiderSk className="h-9 w-20 rounded-full" />
          </div>
          <RiderSk className="mt-2 h-3 w-36 rounded" />
          <RiderSk className="mt-2.5 h-7 w-full rounded-lg" />
        </div>
      </section>

      {/* Activity (no stat strip) */}
      <section>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c]">
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <RiderSk className="h-4 w-24 rounded" />
            <RiderSk className="h-4 w-14 rounded" />
          </div>
          <div className="space-y-1.5 px-3 pb-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-3"
              >
                <RiderSk className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <RiderSk className="h-4 w-28 max-w-full rounded" />
                  <RiderSk className="h-3 w-20 rounded" />
                </div>
                <RiderSk className="h-5 w-14 shrink-0 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy row + report CTA */}
      <section className="space-y-2">
        <div className="rounded-2xl border border-white/10 bg-surface-1 p-4">
          <div className="flex items-center gap-2.5">
            <RiderSk className="h-9 w-9 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <RiderSk className="h-4 w-32 max-w-full rounded" />
              <RiderSk className="h-3 w-40 max-w-full rounded" />
            </div>
          </div>
        </div>
        <RiderSk className="h-[52px] w-full rounded-2xl border border-white/10" />
      </section>

      {/* Week chart & zone risk — matches collapsed <details> summary */}
      <section>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-1 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
          <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1 space-y-2">
              <RiderSk className="h-3.5 w-44 max-w-full rounded-md" />
              <RiderSk className="h-3 w-full max-w-[220px] rounded-md" />
            </div>
            <RiderSk className="h-5 w-5 shrink-0 rounded-md" />
          </div>
        </div>
      </section>

      {/* Quick links — collapsed summary */}
      <section>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-1">
          <div className="flex items-center justify-between gap-2 px-4 py-3.5">
            <RiderSk className="h-3.5 w-36 rounded-md" />
            <RiderSk className="h-4 w-4 shrink-0 rounded" />
          </div>
        </div>
      </section>

      {/* Insight card placeholder (real card may be hidden when no copy) */}
      <div className="overflow-hidden rounded-2xl border border-uber-yellow/15 bg-uber-yellow/[0.04]">
        <RiderSk className="h-0.5 w-full rounded-none opacity-60" />
        <div className="flex items-start gap-2.5 px-3.5 py-3.5">
          <RiderSk className="mt-0.5 h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <RiderSk className="h-3.5 w-24 rounded" />
            <RiderSk className="h-3 w-full rounded" />
            <RiderSk className="h-3 w-[80%] max-w-[280px] rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
