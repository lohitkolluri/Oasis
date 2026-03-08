import { ChevronRight, FileCheck, Shield } from "lucide-react";
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
      <div className="rounded-[24px] bg-surface-1 border border-white/10 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-zinc-700/25 shrink-0">
            <FileCheck className="text-zinc-500" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-400">No active coverage</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Get a weekly policy to enable automatic payouts
            </p>
          </div>
        </div>
        <ButtonLink href="/dashboard/policy" variant="primary" size="sm">
          Get coverage
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] bg-surface-1 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-uber-green/12 shrink-0">
            <Shield className="text-uber-green" style={{ width: 17, height: 17 }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Current policy</p>
            {planName && (
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{planName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Details row */}
      <div className="mx-5 mb-4 rounded-[14px] bg-black/40 border border-white/10 divide-y divide-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[11px] text-zinc-500 font-medium">Coverage period</span>
          <span className="text-[12px] text-zinc-300 tabular-nums font-medium">
            {formatDate(policy.week_start_date)} – {formatDate(policy.week_end_date)}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[11px] text-zinc-500 font-medium">Weekly premium</span>
          <span className="text-[12px] font-bold text-zinc-200 tabular-nums">
            ₹{Number(policy.weekly_premium_inr).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Recent payouts */}
      {claims.length > 0 && (
        <div className="mx-5 mb-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.12em] mb-2.5">
            Recent Payouts
          </p>
          <div className="space-y-2">
            {claims.slice(0, 3).map((c) => (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-center justify-between rounded-[12px] bg-uber-green/10 border border-uber-green/20 px-3.5 py-2.5">
                  <span className="text-[11px] text-zinc-500 tabular-nums">
                    {formatDate(c.created_at)}
                  </span>
                  <span className="text-[13px] font-bold text-uber-green tabular-nums">
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

      {/* Footer link */}
      <div className="px-5 pb-4 pt-1">
        <Link
          href="/dashboard/policy"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-500 hover:text-uber-green transition-colors"
        >
          Manage policy
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
