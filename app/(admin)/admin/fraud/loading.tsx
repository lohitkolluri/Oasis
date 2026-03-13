import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function FraudLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="h-7 w-36 bg-[#1e1e1e] rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-[#161616] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[#2d2d2d] bg-[#161616] p-4 h-[100px] animate-pulse" />
        ))}
      </div>
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
