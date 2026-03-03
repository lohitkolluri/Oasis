import Link from "next/link";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function PolicyDocumentsLink() {
  return (
    <Link href="/dashboard/policy/docs" className="block">
      <Card variant="ghost" padding="md" className="group">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800/80 text-zinc-400 group-hover:bg-zinc-700/80 group-hover:text-zinc-300 transition-colors">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">Policy documents</p>
            <p className="text-xs text-zinc-500 mt-0.5">Terms, coverage & exclusions</p>
          </div>
          <span className="ml-auto text-zinc-600 group-hover:text-zinc-400 transition-colors">
            →
          </span>
        </div>
      </Card>
    </Link>
  );
}
