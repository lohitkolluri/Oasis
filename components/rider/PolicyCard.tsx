import { ChevronRight, FileCheck } from "lucide-react";
import Link from "next/link";
import type { WeeklyPolicy, ParametricClaim } from "@/lib/types/database";
import { ButtonLink } from "@/components/ui/Button";
import { ClaimVerificationPrompt } from "./ClaimVerificationPrompt";

interface PolicyCardProps {
  policy: WeeklyPolicy | null;
  profileId: string;
  claims: ParametricClaim[];
  planName?: string;
  claimIdsNeedingVerification?: string[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function PolicyCard({
  policy,
  profileId: _profileId,
  claims,
  planName,
  claimIdsNeedingVerification = [],
}: PolicyCardProps) {
  if (!policy) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
          <FileCheck className="h-3.5 w-3.5 text-zinc-600" />
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
            Weekly Policy
          </span>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-zinc-500 mb-4">No active weekly coverage.</p>
          <ButtonLink href="/dashboard/policy" variant="primary" size="sm">
            Get coverage
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
            Active Policy
          </span>
        </div>
        {planName && (
          <span className="text-xs text-zinc-400 font-medium">{planName}</span>
        )}
      </div>
      <div className="divide-y divide-zinc-800/70">
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-xs text-zinc-500">Coverage</span>
          <span className="text-xs text-zinc-300 tabular-nums">
            {formatDate(policy.week_start_date)} – {formatDate(policy.week_end_date)}
          </span>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-xs text-zinc-500">Weekly premium</span>
          <span className="text-xs font-semibold text-zinc-200 tabular-nums">
            ₹{Number(policy.weekly_premium_inr).toLocaleString("en-IN")}
          </span>
        </div>
        {claims.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Recent Payouts
            </p>
            <div className="space-y-3">
              {claims.slice(0, 3).map((c) => (
                <div key={c.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {formatDate(c.created_at)}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                      +₹{Number(c.payout_amount_inr).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {claimIdsNeedingVerification.includes(c.id) && (
                    <ClaimVerificationPrompt claimId={c.id} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-5 py-3.5 border-t border-zinc-800">
        <Link
          href="/dashboard/policy"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
        >
          Manage policy
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
