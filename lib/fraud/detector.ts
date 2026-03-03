/**
 * Fraud detection for parametric claims.
 * - Duplicate: same policy + same disruption event
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface FraudCheckResult {
  isFlagged: boolean;
  reason?: string;
}

export async function checkDuplicateClaim(
  supabase: SupabaseClient,
  policyId: string,
  disruptionEventId: string
): Promise<FraudCheckResult> {
  const { data } = await supabase
    .from("parametric_claims")
    .select("id")
    .eq("policy_id", policyId)
    .eq("disruption_event_id", disruptionEventId)
    .limit(1);

  if (data && data.length > 0) {
    return { isFlagged: true, reason: "Duplicate claim: same policy and disruption event" };
  }
  return { isFlagged: false };
}

export async function flagClaimAsFraud(
  supabase: SupabaseClient,
  claimId: string,
  reason: string
): Promise<void> {
  await supabase
    .from("parametric_claims")
    .update({ is_flagged: true, flag_reason: reason })
    .eq("id", claimId);
}
