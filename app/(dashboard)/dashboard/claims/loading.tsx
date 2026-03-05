export default function ClaimsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 w-20 bg-[#1e2535] rounded" />

      {/* Title skeleton */}
      <div>
        <div className="h-6 w-36 bg-[#1e2535] rounded-lg" />
        <div className="h-3 w-48 bg-[#1e2535]/40 rounded mt-1.5" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[20px] bg-[#111820] border border-[#1e2535]/70 p-4">
            <div className="w-8 h-8 rounded-[10px] bg-[#1e2535] mb-3" />
            <div className="h-6 w-10 bg-[#1e2535] rounded mb-1.5" />
            <div className="h-3 w-12 bg-[#1e2535]/40 rounded" />
          </div>
        ))}
      </div>

      {/* Claims list skeleton */}
      <div className="rounded-[24px] bg-[#111820] border border-[#1e2535]/70 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1e2535]/50">
          <div className="h-3 w-16 bg-[#1e2535] rounded" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-5 py-4 flex items-start gap-3.5 border-b border-[#1e2535]/40 last:border-0">
            <div className="w-9 h-9 rounded-[12px] bg-[#1e2535]" />
            <div className="flex-1">
              <div className="h-4 w-20 bg-[#1e2535] rounded mb-2" />
              <div className="h-3 w-32 bg-[#1e2535]/40 rounded mb-1.5" />
              <div className="h-3 w-24 bg-[#1e2535]/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
