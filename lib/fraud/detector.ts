/**
 * Fraud detection for parametric claims.
 * - Duplicate: same policy + same disruption event
 * - Rapid claims: same policy, many claims in short window
 * - Location validation: rider zone must be within event geofence (done in adjudicator)
 * - Weather mismatch: raw_api_data must have plausible values for trigger type
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

/**
 * Weather mismatch: verify raw_api_data has plausible values for the trigger.
 * Flags if trigger claims extreme values but raw data doesn't support it.
 */
export function checkWeatherMismatch(rawApiData: Record<string, unknown> | null): FraudCheckResult {
  if (!rawApiData) return { isFlagged: false };
  const trigger = rawApiData.trigger as string | undefined;
  if (!trigger) return { isFlagged: false };

  if (trigger === "extreme_heat") {
    const data = rawApiData.data as { values?: { temperature?: number } } | undefined;
    const temp = data?.values?.temperature ?? rawApiData.temperature;
    if (temp != null && typeof temp === "number" && temp < 40) {
      return { isFlagged: true, reason: `Weather mismatch: extreme_heat but temp=${temp}°C` };
    }
  }
  if (trigger === "heavy_rain") {
    const data = rawApiData.data as { values?: { precipitationIntensity?: number } } | undefined;
    const precip = data?.values?.precipitationIntensity ?? rawApiData.precipitationIntensity;
    if (precip != null && typeof precip === "number" && precip < 2) {
      return { isFlagged: true, reason: `Weather mismatch: heavy_rain but precip=${precip} mm/h` };
    }
  }
  if (trigger === "severe_aqi") {
    const hourly = rawApiData.hourly as { us_aqi?: (number | null)[] } | undefined;
    const arr = hourly?.us_aqi ?? [];
    const aqi = arr.find((v) => v != null) ?? rawApiData.aqi;
    if (aqi != null && typeof aqi === "number" && aqi < 200) {
      return { isFlagged: true, reason: `Weather mismatch: severe_aqi but AQI=${aqi}` };
    }
  }
  return { isFlagged: false };
}

export async function runAllFraudChecks(
  supabase: SupabaseClient,
  policyId: string,
  disruptionEventId: string,
  rawApiData?: Record<string, unknown> | null
): Promise<FraudCheckResult> {
  const duplicate = await checkDuplicateClaim(supabase, policyId, disruptionEventId);
  if (duplicate.isFlagged) return duplicate;

  const rapid = await checkRapidClaims(supabase, policyId);
  if (rapid.isFlagged) return rapid;

  if (rawApiData) {
    const weather = checkWeatherMismatch(rawApiData);
    if (weather.isFlagged) return weather;
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
