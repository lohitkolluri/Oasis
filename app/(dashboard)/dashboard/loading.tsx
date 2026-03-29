export default function DashboardLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Greeting skeleton */}
      <div className="pt-1 pb-0.5">
        <div className="h-5 w-44 bg-white/10 rounded-lg" />
        <div className="h-3 w-32 bg-white/10 rounded mt-1.5" />
      </div>

      {/* Coverage status banner skeleton */}
      <div className="rounded-2xl border border-white/10 bg-surface-1 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-4 w-28 bg-white/10 rounded" />
              <div className="h-4 w-16 bg-white/10 rounded-full" />
            </div>
            <div className="h-3 w-36 bg-white/10 rounded mt-1.5" />
          </div>
          <div className="text-right">
            <div className="h-6 w-8 bg-white/10 rounded mx-auto" />
            <div className="h-2.5 w-12 bg-white/10 rounded mt-1" />
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-white/10" />
      </div>

      {/* Wallet card skeleton */}
      <div className="rounded-2xl bg-[#0c0c0c] border border-white/10 px-4 pt-4 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10" />
            <div>
              <div className="h-3 w-20 bg-white/10 rounded" />
              <div className="h-7 w-28 bg-white/10 rounded-lg mt-1" />
            </div>
          </div>
          <div className="h-9 w-20 bg-white/10 rounded-full" />
        </div>
        <div className="h-3 w-36 bg-white/10 rounded mt-2" />
        <div className="h-7 w-full bg-white/5 rounded mt-2.5" />
      </div>

      {/* Activity timeline skeleton */}
      <div className="rounded-2xl bg-[#0c0c0c] border border-white/10 overflow-hidden">
        {/* Stat strip */}
        <div className="flex gap-px bg-white/5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 bg-[#0c0c0c] py-2.5 px-1 flex flex-col items-center">
              <div className="h-4 w-12 bg-white/10 rounded" />
              <div className="h-2.5 w-8 bg-white/10 rounded mt-1" />
            </div>
          ))}
        </div>
        {/* Timeline header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="h-4 w-20 bg-white/10 rounded" />
          <div className="h-4 w-14 bg-white/10 rounded" />
        </div>
        {/* Timeline items */}
        <div className="px-3 pb-3 space-y-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-black/40 border border-white/10 px-3 py-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-white/10 rounded" />
                <div className="h-3 w-20 bg-white/10 rounded mt-1.5" />
              </div>
              <div className="h-5 w-14 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Policy card skeleton */}
      <div className="rounded-2xl bg-surface-1 border border-white/10 p-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-white/10 rounded" />
            <div className="h-3 w-32 bg-white/10 rounded mt-1" />
          </div>
        </div>
      </div>

      {/* Report CTA skeleton */}
      <div className="h-[52px] rounded-2xl bg-white/5 border border-white/10" />

      {/* Earnings chart skeleton */}
      <div className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
        <div className="px-4 pt-4 pb-1.5 flex items-center justify-between">
          <div className="h-4 w-36 rounded bg-white/10" />
          <div className="h-4 w-16 rounded bg-white/10" />
        </div>
        <div className="w-full h-[160px] px-3 pb-3">
          <div className="h-full w-full rounded-xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
