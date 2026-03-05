import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function FraudLoading() {
  return (
    <div className="space-y-8 py-2 animate-fade-in">
      <div className="h-4 w-20 bg-[#262626] rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-9 w-44 bg-[#1e1e1e] rounded-xl animate-pulse" />
        <div className="h-4 w-80 bg-[#161616] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-[#2d2d2d] bg-[#161616] p-5 h-24 animate-pulse" />
        ))}
      </div>
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
