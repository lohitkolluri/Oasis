/**
 * Fraud detection for parametric claims.
 * - Duplicate: same policy + same disruption event
 * - Rapid claims: same policy, many claims in short window
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface FraudCheckResult {
  isFlagged: boolean;
  reason?: string;
}

const RAPID_CLAIMS_WINDOW_HOURS = 24;
const RAPID_CLAIMS_THRESHOLD = 4;

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
    return { isFlagged: true, reason: "Duplicate: same policy + disruption event" };
  }
  return { isFlagged: false };
}

/**
 * Flags if policy has too many claims in a short window (suspicious pattern).
 */
export async function checkRapidClaims(
  supabase: SupabaseClient,
  policyId: string
): Promise<FraudCheckResult> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - RAPID_CLAIMS_WINDOW_HOURS);

  const { data } = await supabase
    .from("parametric_claims")
    .select("id")
    .eq("policy_id", policyId)
    .gte("created_at", windowStart.toISOString());

  const count = (data ?? []).length;
  if (count >= RAPID_CLAIMS_THRESHOLD) {
    return {
      isFlagged: true,
      reason: `Rapid claims: ${count} in ${RAPID_CLAIMS_WINDOW_HOURS}h (threshold ${RAPID_CLAIMS_THRESHOLD})`,
    };
  }
  return { isFlagged: false };
}

export async function runAllFraudChecks(
  supabase: SupabaseClient,
  policyId: string,
  disruptionEventId: string
): Promise<FraudCheckResult> {
  const duplicate = await checkDuplicateClaim(supabase, policyId, disruptionEventId);
  if (duplicate.isFlagged) return duplicate;

  const rapid = await checkRapidClaims(supabase, policyId);
  if (rapid.isFlagged) return rapid;

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
