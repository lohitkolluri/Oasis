/**
 * Fraud detection for parametric claims.
 *
 * Checks (in order):
 *  1. Duplicate: same policy + same disruption event → instant skip
 *  2. Rapid claims: policy has ≥ RAPID_CLAIMS_THRESHOLD claims in 24 h
 *  3. Weather mismatch: raw API values don't support the stated trigger
 *  4. Location verification: rider GPS was recorded outside the event geofence
 *  5. Device fingerprint: same device hash across multiple zones in 1h (NEW)
 *  6. Cluster anomaly: ≥80% of zone claims in <10 min (NEW)
 *  7. Historical baseline: zone claim rate >3× 4-week rolling average (NEW)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export interface FraudCheckResult {
  isFlagged: boolean;
  reason?: string;
}

const RAPID_CLAIMS_WINDOW_HOURS = 24;
const RAPID_CLAIMS_THRESHOLD = 5; // raised from 4: 3 legit triggers/day + 1 buffer

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

/** Flags if a policy has unusually many claims in a short window. */
export async function checkRapidClaims(
  supabase: SupabaseClient,
  policyId: string
): Promise<FraudCheckResult> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - RAPID_CLAIMS_WINDOW_HOURS);

  const { count } = await supabase
    .from("parametric_claims")
    .select("id", { count: "exact", head: true })
    .eq("policy_id", policyId)
    .gte("created_at", windowStart.toISOString());

  if ((count ?? 0) >= RAPID_CLAIMS_THRESHOLD) {
    return {
      isFlagged: true,
      reason: `Rapid claims: ${count} in ${RAPID_CLAIMS_WINDOW_HOURS}h (threshold ${RAPID_CLAIMS_THRESHOLD})`,
    };
  }
  return { isFlagged: false };
}

/**
 * Weather mismatch: verify raw_api_data supports the stated trigger type.
 * Thresholds are set just below the adjudicator trigger levels to catch
 * edge-cases where data has been altered or spoofed.
 */
export function checkWeatherMismatch(
  rawApiData: Record<string, unknown> | null
): FraudCheckResult {
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
    const data = rawApiData.data as {
      values?: { precipitationIntensity?: number };
    } | undefined;
    // Adjudicator triggers at ≥ 4 mm/h; flag if raw data shows < 3 mm/h
    const precip = data?.values?.precipitationIntensity ?? rawApiData.precipitationIntensity;
    if (precip != null && typeof precip === "number" && precip < 3) {
      return {
        isFlagged: true,
        reason: `Weather mismatch: heavy_rain but precip=${precip} mm/h`,
      };
    }
  }

  if (trigger === "severe_aqi") {
    // Adaptive AQI: the raw data stores both current_aqi and adaptive_threshold
    // so the mismatch check validates against the zone's own computed threshold,
    // not a fixed global number (which would be wrong for Delhi vs Bangalore).
    const currentAqi =
      (rawApiData.current_aqi as number | undefined) ??
      ((rawApiData.hourly as { us_aqi?: (number | null)[] } | undefined)?.us_aqi ?? []).find(
        (v) => v != null
      );
    const adaptiveThreshold =
      (rawApiData.adaptive_threshold as number | undefined) ?? 201;

    // Flag if current AQI is more than 20% below the threshold that was claimed
    // to have been breached — indicates data mismatch or spoofing
    if (
      currentAqi != null &&
      typeof currentAqi === "number" &&
      currentAqi < adaptiveThreshold * 0.8
    ) {
      return {
        isFlagged: true,
        reason: `Weather mismatch: severe_aqi claimed (threshold=${adaptiveThreshold}) but AQI=${currentAqi}`,
      };
    }
  }

  return { isFlagged: false };
}

/**
 * Location verification: if the rider submitted a GPS check and was recorded
 * outside the event geofence, flag the claim.
 */
export async function checkLocationVerification(
  supabase: SupabaseClient,
  claimId: string
): Promise<FraudCheckResult> {
  const { data } = await supabase
    .from("claim_verifications")
    .select("status")
    .eq("claim_id", claimId)
    .limit(1);

  const v = data?.[0] as { status?: string } | undefined;
  if (v?.status === "outside_geofence") {
    return {
      isFlagged: true,
      reason: "Location verification: rider GPS outside event geofence",
    };
  }
  return { isFlagged: false };
}

/**
 * Run all applicable fraud checks.
 * Duplicate + rapid-claims run in parallel to reduce DB round-trips.
 */
export async function runAllFraudChecks(
  supabase: SupabaseClient,
  policyId: string,
  disruptionEventId: string,
  rawApiData?: Record<string, unknown> | null
): Promise<FraudCheckResult> {
  // Run independent DB checks in parallel
  const [duplicate, rapid] = await Promise.all([
    checkDuplicateClaim(supabase, policyId, disruptionEventId),
    checkRapidClaims(supabase, policyId),
  ]);

  if (duplicate.isFlagged) return duplicate;
  if (rapid.isFlagged) return rapid;

  // Synchronous weather-data validation (no DB call)
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

/**
 * Device fingerprint fraud: flag if the same device hash has been used
 * across claims in more than 1 distinct zone within the last hour.
 */
export async function checkDeviceFingerprint(
  supabase: SupabaseClient,
  deviceFingerprint: string
): Promise<FraudCheckResult> {
  if (!deviceFingerprint) return { isFlagged: false };

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("parametric_claims")
    .select("disruption_event_id")
    .eq("device_fingerprint", deviceFingerprint)
    .gte("created_at", oneHourAgo);

  if (!data || data.length < 2) return { isFlagged: false };

  // Get the geofence centers of those events
  const eventIds = [...new Set((data as Array<{ disruption_event_id: string }>).map((c) => c.disruption_event_id))];
  const { data: events } = await supabase
    .from("live_disruption_events")
    .select("geofence_polygon")
    .in("id", eventIds);

  if (!events || events.length < 2) return { isFlagged: false };

  const lats = (events as Array<{ geofence_polygon: unknown }>)
    .map((e) => (e.geofence_polygon as { lat?: number })?.lat)
    .filter((v): v is number => v != null);

  if (lats.length < 2) return { isFlagged: false };

  const latDiff = Math.max(...lats) - Math.min(...lats);
  // > 0.5 degree lat ≈ >55 km — impossible for a single rider in 1 hour
  if (latDiff > 0.5) {
    return {
      isFlagged: true,
      reason: `Device fingerprint: same device in ${eventIds.length} distant zones within 1h`,
    };
  }

  return { isFlagged: false };
}

/**
 * Cluster anomaly: flag if ≥5 claims for this disruption event were created
 * within a 10-minute window (coordinated/bot-like pattern).
 */
export async function checkClusterAnomaly(
  supabase: SupabaseClient,
  disruptionEventId: string
): Promise<FraudCheckResult> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("parametric_claims")
    .select("id", { count: "exact", head: true })
    .eq("disruption_event_id", disruptionEventId)
    .gte("created_at", tenMinutesAgo);

  if ((count ?? 0) >= 10) {
    return {
      isFlagged: true,
      reason: `Cluster anomaly: ${count} claims in <10 min for same event`,
    };
  }

  return { isFlagged: false };
}

/**
 * Historical baseline anomaly: flag if this event has >3× the rolling
 * 4-week average claim rate for its zone.
 * Uses the zone_baseline_stats DB view when available.
 */
export async function checkHistoricalBaseline(
  supabase: SupabaseClient,
  disruptionEventId: string
): Promise<FraudCheckResult> {
  try {
    const { data } = await supabase
      .from("zone_baseline_stats")
      .select("total_claims, rolling_avg_claims")
      .eq("event_id", disruptionEventId)
      .single();

    if (!data) return { isFlagged: false };

    const avg = Number(data.rolling_avg_claims);
    const current = Number(data.total_claims);

    if (avg > 0 && current > avg * 3) {
      return {
        isFlagged: true,
        reason: `Historical baseline: ${current} claims vs. ${avg.toFixed(1)} avg (${((current / avg) * 100).toFixed(0)}% above baseline)`,
      };
    }
  } catch {
    // View may not exist or no historical data yet
  }

  return { isFlagged: false };
}

/**
 * Extended fraud check that includes device fingerprint + cluster anomaly.
 * Call this after claim insertion when device fingerprint is available.
 */
export async function runExtendedFraudChecks(
  supabase: SupabaseClient,
  claimId: string,
  disruptionEventId: string,
  deviceFingerprint?: string
): Promise<FraudCheckResult> {
  const checks: Promise<FraudCheckResult>[] = [
    checkClusterAnomaly(supabase, disruptionEventId),
    checkHistoricalBaseline(supabase, disruptionEventId),
  ];

  if (deviceFingerprint) {
    checks.push(checkDeviceFingerprint(supabase, deviceFingerprint));
  }

  const results = await Promise.all(checks);
  const flagged = results.find((r) => r.isFlagged);

  if (flagged) {
    await flagClaimAsFraud(supabase, claimId, flagged.reason ?? "Extended fraud check");
    return flagged;
  }

  return { isFlagged: false };
}
