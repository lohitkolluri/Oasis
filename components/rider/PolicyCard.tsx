import { FileCheck } from "lucide-react";
import Link from "next/link";
import type { WeeklyPolicy, ParametricClaim } from "@/lib/types/database";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

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
      <Card variant="elevated" padding="lg">
        <CardHeader
          icon={
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800">
              <FileCheck className="h-5 w-5 text-zinc-500" />
            </div>
          }
          title="Weekly Policy"
          description="Subscribe to protect your income"
        />
        <p className="text-zinc-500 text-sm mb-5">
          No active weekly coverage.
        </p>
        <ButtonLink href="/dashboard/policy" variant="primary" size="sm">
          Get coverage
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader
        icon={
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10">
            <FileCheck className="h-5 w-5 text-emerald-400" />
          </div>
        }
        title="Active Weekly Policy"
      />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between py-1.5">
          <span className="text-zinc-500">Coverage</span>
          <span className="text-zinc-300 tabular-nums">
            {formatDate(policy.week_start_date)} – {formatDate(policy.week_end_date)}
          </span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-zinc-500">Premium</span>
          <span className="font-medium tabular-nums">
            ₹{Number(policy.weekly_premium_inr).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
      {claims.length > 0 && (
        <div className="mt-5 pt-4 border-t border-zinc-800/60">
          <p className="text-xs text-zinc-500 mb-2 font-medium">Recent payouts</p>
          <ul className="space-y-2">
            {claims.slice(0, 3).map((c) => (
              <li key={c.id} className="flex justify-between text-sm">
                <span className="text-zinc-400">{formatDate(c.created_at)}</span>
                <span className="text-emerald-400 font-medium tabular-nums">
                  +₹{Number(c.payout_amount_inr).toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link
        href="/dashboard/policy"
        className="mt-5 inline-flex items-center text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
      >
        Manage policy →
      </Link>
    </Card>
  );
}
