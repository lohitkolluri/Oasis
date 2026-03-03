import { FileCheck } from "lucide-react";
import Link from "next/link";
import type { WeeklyPolicy, ParametricClaim } from "@/lib/types/database";

interface PolicyCardProps {
  policy: WeeklyPolicy | null;
  profileId: string;
  claims: ParametricClaim[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function PolicyCard({ policy, profileId, claims }: PolicyCardProps) {
  if (!policy) {
    return (
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileCheck className="h-5 w-5 text-zinc-500" />
          <h2 className="font-semibold">Weekly Policy</h2>
        </div>
        <p className="text-zinc-400 text-sm mb-4">
          No active weekly coverage. Subscribe to protect your income.
        </p>
        <Link
          href="/dashboard/policy"
          className="inline-block px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition-colors"
        >
          Get coverage
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileCheck className="h-5 w-5 text-emerald-400" />
        <h2 className="font-semibold">Active Weekly Policy</h2>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-400">Coverage period</span>
          <span>
            {formatDate(policy.week_start_date)} – {formatDate(policy.week_end_date)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Weekly premium</span>
          <span className="font-medium">₹{Number(policy.weekly_premium_inr).toLocaleString("en-IN")}</span>
        </div>
      </div>
      {claims.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Recent payouts</p>
          <ul className="space-y-1">
            {claims.slice(0, 3).map((c) => (
              <li key={c.id} className="flex justify-between text-sm">
                <span>{formatDate(c.created_at)}</span>
                <span className="text-emerald-400">
                  +₹{Number(c.payout_amount_inr).toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link
        href="/dashboard/policy"
        className="mt-4 inline-block text-sm text-emerald-400 hover:underline"
      >
        Manage policy →
      </Link>
    </div>
  );
}
