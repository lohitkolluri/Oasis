import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function TriggersLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="h-7 w-36 bg-[#1e1e1e] rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-[#161616] rounded animate-pulse" />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
