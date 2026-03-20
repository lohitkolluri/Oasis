import type { SupabaseAdmin } from "@/lib/adjudicator/types";
import type { ParametricClaim, WeeklyPolicy } from "@/lib/types/database";
import { currentWeekMonday } from "@/lib/utils/geo";
import { simulatePayout } from "@/lib/adjudicator/payouts";

export type ClaimSource = "adjudicator" | "self_report" | "gps_verification" | "admin_action";

export interface CreateClaimFromTriggerInput {
  supabase: SupabaseAdmin;
  policy: Pick<WeeklyPolicy, "id" | "profile_id" | "plan_id"> & {
    plan_packages?: { payout_per_claim_inr?: number | null; max_claims_per_week?: number | null } | null;
  };
  disruptionEventId: string;
  payoutAmountInr: number;
  maxClaimsPerWeek: number;
  preExistingWeekCounts?: Map<string, number>;
  phoneNumber?: string | null;
  isDemo?: boolean;
}

export interface CreateClaimFromTriggerResult {
  claim: Pick<ParametricClaim, "id" | "policy_id" | "disruption_event_id" | "payout_amount_inr" | "status">;
  skippedReason?: "weekly_cap_reached" | "duplicate_phone" | "fraud_flagged";
  payoutInitiated: boolean;
  payoutFailed: boolean;
}

/**
 * Aggregates the total claims historically generated within the current week for specific policies.
 * Utilized to strictly enforce tier-level payout frequency limits algorithmically.
 *
 * @param supabase - Admin client instance
 * @param policyIds - Array of relevant policy identifiers
 * @returns A map binding each policy ID to its rolling weekly claim execution count
 */
export async function getWeeklyClaimCounts(
  supabase: SupabaseAdmin,
  policyIds: string[],
): Promise<Map<string, number>> {
  if (policyIds.length === 0) return new Map();
  const weekStart = currentWeekMonday().toISOString();
  const { data: existingClaims } = await supabase
    .from("parametric_claims")
    .select("policy_id")
    .in("policy_id", policyIds)
    .gte("created_at", weekStart);

  const claimCountMap = new Map<string, number>();
  for (const c of existingClaims ?? []) {
    claimCountMap.set(c.policy_id, (claimCountMap.get(c.policy_id) ?? 0) + 1);
  }
  return claimCountMap;
}

/**
 * Orchestrates the full creation pipeline for a parametric claim against an active trigger.
 * Evaluates weekly actuarial maximums strictly prior to executing database ledger queries.
 * For configured demo environments, instantly overrides and trips the simulated payout gateway natively.
 *
 * @param input - Configuration payload containing the source policy, disruption bounds, and bypass flags
 * @returns Complete payload wrapping the newly generated claim and its linked transaction pipeline context
 */
export async function createClaimFromTrigger(
  input: CreateClaimFromTriggerInput,
): Promise<CreateClaimFromTriggerResult | null> {
  const {
    supabase,
    policy,
    disruptionEventId,
    payoutAmountInr,
    maxClaimsPerWeek,
    preExistingWeekCounts,
    phoneNumber,
    isDemo,
  } = input;

  const claimCountMap =
    preExistingWeekCounts ?? (await getWeeklyClaimCounts(supabase, [policy.id]));
  const currentWeekCount = claimCountMap.get(policy.id) ?? 0;
  if (currentWeekCount >= maxClaimsPerWeek) {
    return {
      claim: {
        id: "",
        policy_id: policy.id,
        disruption_event_id: disruptionEventId,
        payout_amount_inr: payoutAmountInr,
        status: "pending_verification",
      },
      skippedReason: "weekly_cap_reached",
      payoutInitiated: false,
      payoutFailed: false,
    };
  }

  const { data: claimData, error: claimErr } = await supabase
    .from("parametric_claims")
    .insert({
      policy_id: policy.id,
      disruption_event_id: disruptionEventId,
      payout_amount_inr: payoutAmountInr,
      status: "pending_verification",
      is_flagged: false,
    })
    .select("id, policy_id, disruption_event_id, payout_amount_inr, status")
    .single();

  if (claimErr || !claimData) {
    return null;
  }

  // For demo flows we still support immediate simulated payout.
  let payoutInitiated = false;
  let payoutFailed = false;
  if (isDemo) {
    const payoutOk = await simulatePayout(
      supabase,
      claimData.id,
      policy.profile_id,
      payoutAmountInr,
    );
    if (payoutOk) {
      payoutInitiated = true;
      await supabase
        .from("parametric_claims")
        .update({
          status: "paid",
          gateway_transaction_id: `oasis_demo_${Date.now()}_${claimData.id.slice(0, 8)}`,
        })
        .eq("id", claimData.id);
    } else {
      payoutFailed = true;
    }
  }

  if (preExistingWeekCounts) {
    preExistingWeekCounts.set(policy.id, currentWeekCount + 1);
  }

  return {
    claim: claimData,
    payoutInitiated,
    payoutFailed,
  };
}

export interface MarkClaimPaidInput {
  supabase: SupabaseAdmin;
  claimId: string;
  profileId: string;
  payoutAmountInr: number;
  source: ClaimSource;
}

/**
 * Safely executes ledger closure for an established claim upon transaction receipt.
 *
 * @param input - Payload binding the source profile, authorized payout configuration, and claim tracker
 * @returns Boolean representing if the closure pipeline resolved completely natively
 */
export async function markClaimPaid(input: MarkClaimPaidInput): Promise<boolean> {
  const { supabase, claimId, profileId, payoutAmountInr } = input;
  const payoutOk = await simulatePayout(supabase, claimId, profileId, payoutAmountInr);
  if (!payoutOk) return false;

  await supabase
    .from("parametric_claims")
    .update({
      status: "paid",
    })
    .eq("id", claimId);

  return true;
}

