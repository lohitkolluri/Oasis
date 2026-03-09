/** Server-only data helpers for rider dashboard and wallet. Use Supabase server client. */

import type { ParametricClaim, RiderWallet, WeeklyPolicy } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClaimWithEvent = ParametricClaim & {
  live_disruption_events?: { event_type?: string } | null;
};

export type WeeklyPolicyWithPlan = WeeklyPolicy & {
  plan_packages?: { name?: string } | null;
};

export interface RiderPoliciesAndWalletResult {
  policies: WeeklyPolicyWithPlan[] | null;
  policyIds: string[];
  activePolicy: WeeklyPolicyWithPlan | null;
  wallet: Pick<
    RiderWallet,
    "total_earned_inr" | "total_claims" | "this_week_earned_inr" | "this_week_claims"
  > | null;
  claims: ClaimWithEvent[];
  riskSeverity: number;
  claimIdsNeedingVerification: string[];
}

/** Single query path for dashboard and wallet: policies, wallet view, claims, risk, verification state */
export async function getRiderPoliciesAndWallet(
  supabase: SupabaseClient,
  profileId: string,
  options: {
    includeClaims?: boolean;
    includeClaimVerificationIds?: boolean;
    includeRisk?: boolean;
  } = {}
): Promise<RiderPoliciesAndWalletResult> {
  const {
    includeClaims = true,
    includeClaimVerificationIds = true,
    includeRisk = true,
  } = options;

  const [policiesRes, walletRes] = await Promise.all([
    supabase
      .from("weekly_policies")
      .select("*, plan_packages(name)")
      .eq("profile_id", profileId)
      .eq("is_active", true)
      .order("week_start_date", { ascending: false })
      .limit(5),
    (async () => {
      try {
        return await supabase
          .from("rider_wallet")
          .select("total_earned_inr, total_claims, this_week_earned_inr, this_week_claims")
          .eq("rider_id", profileId)
          .single();
      } catch {
        return { data: null };
      }
    })(),
  ]);

  const policies = policiesRes.data ?? null;
  const policyIds = (policies ?? []).map((p) => p.id);
  const activePolicy = policies?.[0] ?? null;

  const [claimsRes, riskRes, verificationRes] = await Promise.all([
    includeClaims && policyIds.length > 0
      ? supabase
          .from("parametric_claims")
          .select("*, live_disruption_events(event_type)")
          .in("policy_id", policyIds)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
    includeRisk
      ? supabase
          .from("live_disruption_events")
          .select("severity_score")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    includeClaimVerificationIds && policyIds.length > 0
      ? (async () => {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: recentClaims } = await supabase
            .from("parametric_claims")
            .select("id, created_at")
            .in("policy_id", policyIds)
            .gte("created_at", dayAgo);
          const recentClaimIds = (recentClaims ?? []).map((c) => c.id);
          if (recentClaimIds.length === 0) return { data: [] as string[] };
          const { data: verifications } = await supabase
            .from("claim_verifications")
            .select("claim_id")
            .eq("profile_id", profileId)
            .in("claim_id", recentClaimIds);
          const verifiedIds = new Set((verifications ?? []).map((v) => v.claim_id));
          return { data: recentClaimIds.filter((id) => !verifiedIds.has(id)) };
        })()
      : Promise.resolve({ data: [] as string[] }),
  ]);

  const claims = (claimsRes.data ?? []) as ClaimWithEvent[];
  const riskSeverity =
    (riskRes.data as { severity_score?: number } | null)?.severity_score ?? 0;
  const claimIdsNeedingVerification =
    includeClaimVerificationIds && Array.isArray(verificationRes.data)
      ? (verificationRes.data as string[])
      : [];

  return {
    policies,
    policyIds,
    activePolicy: activePolicy ?? null,
    wallet: walletRes.data as RiderPoliciesAndWalletResult["wallet"],
    claims,
    riskSeverity,
    claimIdsNeedingVerification,
  };
}

/** Aggregate payouts and weekly daily earnings from getRiderPoliciesAndWallet result */
export function deriveWalletStats(
  result: RiderPoliciesAndWalletResult
): {
  totalPayouts: number;
  totalClaimCount: number;
  thisWeekEarned: number;
  weeklyDailyEarnings: number[];
} {
  const { wallet, claims } = result;
  const paidClaims = claims.filter((c) => c.status === "paid");
  const totalPayouts = wallet
    ? Number(wallet.total_earned_inr)
    : paidClaims.reduce((sum, c) => sum + Number(c.payout_amount_inr), 0);
  const totalClaimCount = wallet ? Number(wallet.total_claims) : paidClaims.length;
  const thisWeekEarned =
    wallet?.this_week_earned_inr != null ? Number(wallet.this_week_earned_inr) : 0;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const weeklyDailyEarnings = [0, 0, 0, 0, 0, 0, 0];
  for (const c of paidClaims) {
    const d = new Date(c.created_at);
    if (d < weekStart || d > weekEnd) continue;
    const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
    weeklyDailyEarnings[dayIndex] += Number(c.payout_amount_inr);
  }

  return {
    totalPayouts,
    totalClaimCount,
    thisWeekEarned,
    weeklyDailyEarnings,
  };
}
