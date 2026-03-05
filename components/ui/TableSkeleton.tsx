export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border border-[#2d2d2d] bg-[#161616] overflow-hidden animate-pulse">
      <div className="border-b border-[#2d2d2d] px-5 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-2.5 bg-[#262626] rounded flex-1"
            style={{ maxWidth: i === cols - 1 ? '80px' : undefined }}
          />
        ))}
      </div>
      <div className="divide-y divide-[#2d2d2d]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-5 py-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-3 bg-[#1e1e1e] rounded flex-1"
                style={{
                  maxWidth: c === 0 ? '140px' : c === cols - 1 ? '60px' : '100px',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
