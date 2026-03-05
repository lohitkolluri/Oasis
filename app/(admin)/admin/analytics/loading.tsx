export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 py-2 animate-fade-in">
      <div className="h-4 w-20 bg-[#262626] rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-9 w-44 bg-[#1e1e1e] rounded-xl animate-pulse" />
        <div className="h-4 w-72 bg-[#161616] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#2d2d2d] bg-[#161616] px-4 py-5 animate-pulse"
          >
            <div className="h-2.5 w-20 bg-[#262626] rounded mb-3" />
            <div className="h-7 w-16 bg-[#262626] rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[#2d2d2d] bg-[#161616] p-5 h-[240px] animate-pulse" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#2d2d2d] bg-[#161616] p-5 h-[220px] animate-pulse" />
        <div className="rounded-2xl border border-[#2d2d2d] bg-[#161616] p-5 h-[220px] animate-pulse" />
      </div>
    </div>
  );
}
