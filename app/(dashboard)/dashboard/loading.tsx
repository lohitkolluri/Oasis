export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Greeting skeleton */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-[#1e2535]" />
        <div>
          <div className="h-5 w-36 bg-[#1e2535] rounded-lg" />
          <div className="h-3 w-24 bg-[#1e2535]/60 rounded mt-1.5" />
        </div>
      </div>

      {/* Wallet card skeleton */}
      <div className="rounded-[24px] bg-[#111820] border border-[#1e2535]/70 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-20 bg-[#1e2535] rounded" />
          <div className="h-3 w-16 bg-[#1e2535]/60 rounded" />
        </div>
        <div className="h-8 w-28 bg-[#1e2535] rounded-lg mb-3" />
        <div className="h-3 w-40 bg-[#1e2535]/40 rounded" />
      </div>

      {/* Policy card skeleton */}
      <div className="rounded-[24px] bg-[#111820] border border-[#1e2535]/70 p-5">
        <div className="h-4 w-24 bg-[#1e2535] rounded mb-4" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-[#1e2535]/50 rounded-xl" />
          <div className="h-16 bg-[#1e2535]/50 rounded-xl" />
        </div>
      </div>

      {/* Claims skeleton */}
      <div className="rounded-[24px] bg-[#111820] border border-[#1e2535]/70 p-5">
        <div className="h-4 w-28 bg-[#1e2535] rounded mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
            <div className="w-9 h-9 rounded-xl bg-[#1e2535]" />
            <div className="flex-1">
              <div className="h-4 w-20 bg-[#1e2535] rounded mb-1.5" />
              <div className="h-3 w-32 bg-[#1e2535]/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
