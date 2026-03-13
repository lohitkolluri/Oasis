import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function RidersLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 bg-[#1e1e1e] rounded-lg animate-pulse" />
          <div className="h-4 w-56 bg-[#161616] rounded animate-pulse" />
        </div>
        <div className="h-7 w-20 bg-[#1e1e1e] rounded-full animate-pulse" />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
