import { RiderSk } from '@/components/rider/RiderSkeleton';

export default function ProfileLoading() {
  return (
    <div className="space-y-6 pb-4" aria-busy="true" aria-label="Loading profile">
      <RiderSk className="h-4 w-12 rounded-md" />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-black px-5 py-6 sm:px-6">
        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
          <RiderSk className="h-[88px] w-[88px] shrink-0 rounded-full ring-2 ring-white/10 ring-offset-4 ring-offset-black" />
          <div className="mt-5 min-w-0 flex-1 space-y-3 sm:mt-0">
            <RiderSk className="mx-auto h-3 w-24 rounded-md sm:mx-0" />
            <RiderSk className="mx-auto h-6 w-40 max-w-full rounded-lg sm:mx-0" />
            <RiderSk className="mx-auto h-4 w-48 max-w-full rounded-md sm:mx-0" />
            <RiderSk className="mx-auto h-7 w-28 rounded-full sm:mx-0" />
            <RiderSk className="mx-auto h-3 w-full max-w-sm rounded sm:mx-0" />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="px-1 space-y-2">
          <RiderSk className="h-3.5 w-36 rounded-md" />
          <RiderSk className="h-3 w-full max-w-md rounded-md" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
          <div className="space-y-4 px-4 pb-1 pt-4">
            {[1, 2].map((i) => (
              <div key={i}>
                <RiderSk className="mb-2 h-3 w-16 rounded" />
                <RiderSk className="h-12 w-full rounded-xl" />
              </div>
            ))}
            <div>
              <RiderSk className="mb-2 h-3 w-28 rounded" />
              <div className="grid grid-cols-2 gap-2 pb-2">
                <RiderSk className="h-12 rounded-xl" />
                <RiderSk className="h-12 rounded-xl" />
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] bg-black/20 p-3">
            <RiderSk className="h-[52px] w-full rounded-xl" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1 space-y-2">
          <RiderSk className="h-3.5 w-28 rounded-md" />
          <RiderSk className="h-3 w-56 max-w-full rounded-md" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 border-b border-white/[0.06] px-4 py-4 last:border-0"
            >
              <RiderSk className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <RiderSk className="h-3.5 w-32 rounded" />
                <RiderSk className="h-3 w-full max-w-[200px] rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <RiderSk className="h-3.5 w-24 rounded-md" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 last:border-0">
              <RiderSk className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <RiderSk className="h-3.5 w-28 rounded" />
                <RiderSk className="h-3 w-20 rounded" />
              </div>
              <RiderSk className="h-4 w-4 shrink-0 rounded" />
            </div>
          ))}
        </div>
      </section>

      <RiderSk className="h-12 w-full rounded-2xl border border-white/10" />
    </div>
  );
}
