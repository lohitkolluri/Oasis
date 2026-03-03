import Link from "next/link";
import { FileText } from "lucide-react";

export function PolicyDocumentsLink() {
  return (
    <Link
      href="/dashboard/policy/docs"
      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-800/40 hover:border-zinc-700/60 transition-colors group"
    >
      <div className="p-2 rounded-lg bg-zinc-800 group-hover:bg-zinc-700/80 transition-colors">
        <FileText className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-200">
          Policy documents
        </p>
        <p className="text-xs text-zinc-500">
          Terms, coverage & exclusions
        </p>
      </div>
    </Link>
  );
}
