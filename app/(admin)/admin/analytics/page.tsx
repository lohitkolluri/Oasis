import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Claims, premiums, loss ratio, and trigger distribution — last 30 days
        </p>
      </div>
      <AnalyticsCharts />
    </div>
  );
}
