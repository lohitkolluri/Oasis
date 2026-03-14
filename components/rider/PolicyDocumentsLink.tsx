import { Card } from '@/components/ui/Card';
import { ChevronRight, FileText } from 'lucide-react';
import Link from 'next/link';

export function PolicyDocumentsLink() {
  return (
    <Card
      variant="default"
      padding="none"
      className="rounded-2xl border-white/10 bg-surface-1 overflow-hidden"
    >
      <Link
        href="/dashboard/policy/docs"
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 active:scale-[0.99] transition-all group min-h-[56px]"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-zinc-400 group-hover:text-zinc-300 transition-colors shrink-0">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-zinc-200 truncate">Policy documents</p>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">Terms, coverage & exclusions</p>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400 shrink-0" />
      </Link>
    </Card>
  );
}
