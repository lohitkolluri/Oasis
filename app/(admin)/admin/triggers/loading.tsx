import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function TriggersLoading() {
  return (
    <div className="space-y-8 py-2 animate-fade-in">
      <div className="h-4 w-20 bg-[#262626] rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-9 w-52 bg-[#1e1e1e] rounded-xl animate-pulse" />
        <div className="h-4 w-80 bg-[#161616] rounded animate-pulse" />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
