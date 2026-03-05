export default function RidersLoading() {
  return (
    <div className="space-y-8 py-2 animate-fade-in">
      <div className="h-4 w-20 bg-[#262626] rounded animate-pulse" />
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-9 w-28 bg-[#1e1e1e] rounded-xl animate-pulse" />
          <div className="h-4 w-56 bg-[#161616] rounded animate-pulse" />
        </div>
        <div className="h-7 w-20 bg-[#1e1e1e] rounded-full animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#2d2d2d] bg-[#161616] px-5 py-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#262626] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-[#262626] rounded" />
                <div className="h-3 w-48 bg-[#1e1e1e] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
