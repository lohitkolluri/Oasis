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
  const recentClaims = claims.slice(0, 3);

  if (!policy) {
    return (
      <div className="rounded-2xl bg-surface-1 border border-white/10 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-700/25 shrink-0">
            <FileCheck className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-zinc-400">No active coverage</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Get a weekly policy to enable automatic payouts
            </p>
          </div>
        </div>
        <ButtonLink href="/dashboard/policy" variant="primary" size="sm" className="w-full justify-center">
          Get coverage
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden bg-surface-1">
      {/* Top: label + manage link — same pattern as other section cards */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 shrink-0">
            <Shield className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">
              {planName ?? "Current policy"}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Coverage & premium</p>
          </div>
        </div>
        <Link
          href="/dashboard/policy"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          Manage
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Single details block — no nested card, cleaner */}
      <div className="px-4 pb-4 pt-1">
        <div className="flex items-center justify-between py-2.5 border-b border-white/10">
          <span className="text-[11px] text-zinc-500">Coverage period</span>
          <span className="text-[13px] font-medium text-white tabular-nums">
            {formatDate(policy.week_start_date)} – {formatDate(policy.week_end_date)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-[11px] text-zinc-500">Weekly premium</span>
          <span className="text-[13px] font-bold text-white tabular-nums">
            ₹{Number(policy.weekly_premium_inr).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Recent claim activity */}
      {recentClaims.length > 0 && (
        <div className="px-4 pb-4 border-t border-white/10 pt-3">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Recent claim activity
          </p>
          <div className="space-y-1.5">
            {recentClaims.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-500 tabular-nums">{formatDate(c.created_at)}</p>
                    <p className="text-[10px] mt-0.5">
                      <span
                        className={
                          c.status === "paid" ? "text-uber-green font-semibold" : "text-amber-400 font-semibold"
                        }
                      >
                        {c.status === "paid" ? "Paid" : "Pending verification"}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`text-[13px] font-semibold tabular-nums ${
                      c.status === "paid" ? "text-uber-green" : "text-zinc-400"
                    }`}
                  >
                    {c.status === "paid" ? "+" : ""}₹{Number(c.payout_amount_inr).toLocaleString("en-IN")}
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
  );
}
