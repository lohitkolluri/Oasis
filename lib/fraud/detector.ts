/**
 * Comprehensive anti-fraud detection suite for parametric claims.
 * Identifies high-risk velocity patterns, geographic spoofing, baseline anomalies, and state mismatches.
 */

import { FRAUD } from '@/lib/config/constants';
import {
  aggregateExtendedFraudRisk,
  computeClusterBurstThreshold,
  persistClaimFraudRisk,
} from '@/lib/fraud/risk-score';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface FraudCheckResult {
  isFlagged: boolean;
  reason?: string;
  checkName?: string;
  facts?: Record<string, unknown>;
}

export type DeviceAttestationSignals = {
  speed_kmh?: number | null;
  imu_variance?: number | null;
  gnss_snr_variance?: number | null;
  dev_settings_enabled?: boolean | null;
  is_mock_location?: boolean | null;
  play_integrity_pass?: boolean | null;
  os_signature_valid?: boolean | null;
  rooted_device?: boolean | null;
};

/**
 * Device-integrity + sensor plausibility checks.
 * These are optional signals; if absent we degrade gracefully.
 */
export function checkDeviceAttestation(
  signals: DeviceAttestationSignals | null | undefined,
): FraudCheckResult {
  if (!signals) return { isFlagged: false };

  if (signals.is_mock_location === true || signals.dev_settings_enabled === true) {
    return {
      isFlagged: true,
      reason: 'Device integrity: mock location / developer settings enabled',
      checkName: 'device_integrity',
      facts: {
        is_mock_location: signals.is_mock_location ?? null,
        dev_settings_enabled: signals.dev_settings_enabled ?? null,
      },
    };
  }

  if (signals.rooted_device === true) {
    return {
      isFlagged: true,
      reason: 'Device integrity: rooted/jailbroken device detected',
      checkName: 'device_integrity',
      facts: { rooted_device: true },
    };
  }

  if (signals.os_signature_valid === false || signals.play_integrity_pass === false) {
    return {
      isFlagged: true,
      reason: 'Device integrity: OS signature / Play Integrity check failed',
      checkName: 'device_integrity',
      facts: {
        os_signature_valid: signals.os_signature_valid ?? null,
        play_integrity_pass: signals.play_integrity_pass ?? null,
      },
    };
  }

  const speed = signals.speed_kmh;
  const imu = signals.imu_variance;
  if (
    speed != null &&
    imu != null &&
    Number.isFinite(speed) &&
    Number.isFinite(imu) &&
    speed >= FRAUD.IMU_SPEED_MIN_KMH &&
    imu < FRAUD.IMU_MIN_VARIANCE
  ) {
    return {
      isFlagged: true,
      reason: `Physics anomaly: speed=${speed}km/h but IMU variance=${imu} (<${FRAUD.IMU_MIN_VARIANCE})`,
      checkName: 'imu_teleportation',
      facts: { speed_kmh: speed, imu_variance: imu },
    };
  }

  const snrVar = signals.gnss_snr_variance;
  if (snrVar != null && Number.isFinite(snrVar) && snrVar < FRAUD.GNSS_SNR_VARIANCE_MIN) {
    return {
      isFlagged: true,
      reason: `GNSS anomaly: SNR variance too low (${snrVar} < ${FRAUD.GNSS_SNR_VARIANCE_MIN})`,
      checkName: 'gnss_snr_variance',
      facts: { gnss_snr_variance: snrVar, min: FRAUD.GNSS_SNR_VARIANCE_MIN },
    };
  }

  return { isFlagged: false };
}

async function checkDuplicateClaim(
  supabase: SupabaseClient,
  policyId: string,
  disruptionEventId: string,
): Promise<FraudCheckResult> {
  const { data } = await supabase
    .from('parametric_claims')
    .select('id')
    .eq('policy_id', policyId)
    .eq('disruption_event_id', disruptionEventId)
    .limit(1);

  if (data && data.length > 0) {
    return {
      isFlagged: true,
      reason: 'Duplicate: same policy + disruption event',
      checkName: 'duplicate_claim',
    };
  }
  return { isFlagged: false };
}

export async function checkRapidClaims(
  supabase: SupabaseClient,
  policyId: string,
): Promise<FraudCheckResult> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - FRAUD.RAPID_CLAIMS_WINDOW_HOURS);

  const { count } = await supabase
    .from('parametric_claims')
    .select('id', { count: 'exact', head: true })
    .eq('policy_id', policyId)
    .gte('created_at', windowStart.toISOString());

  if ((count ?? 0) >= FRAUD.RAPID_CLAIMS_THRESHOLD) {
    return {
      isFlagged: true,
      reason: `Rapid claims: ${count} in ${FRAUD.RAPID_CLAIMS_WINDOW_HOURS}h (threshold ${FRAUD.RAPID_CLAIMS_THRESHOLD})`,
      checkName: 'rapid_claims',
      facts: {
        count: count ?? 0,
        window_hours: FRAUD.RAPID_CLAIMS_WINDOW_HOURS,
        threshold: FRAUD.RAPID_CLAIMS_THRESHOLD,
      },
    };
  }
  return { isFlagged: false };
}

function checkWeatherMismatch(rawApiData: Record<string, unknown> | null): FraudCheckResult {
  if (!rawApiData) return { isFlagged: false };
  const trigger = rawApiData.trigger as string | undefined;
  if (!trigger) return { isFlagged: false };

  if (trigger === 'extreme_heat') {
    const data = rawApiData.data as { values?: { temperature?: number } } | undefined;
    const temp = data?.values?.temperature ?? rawApiData.temperature;
    if (temp != null && typeof temp === 'number' && temp < 40) {
      return {
        isFlagged: true,
        reason: `Weather mismatch: extreme_heat but temp=${temp}°C`,
        checkName: 'weather_mismatch',
        facts: { trigger, temperature_c: temp },
      };
    }
  }

  if (trigger === 'heavy_rain') {
    const data = rawApiData.data as { values?: { precipitationIntensity?: number } } | undefined;
    const precip = data?.values?.precipitationIntensity ?? rawApiData.precipitationIntensity;
    if (precip != null && typeof precip === 'number' && precip < 3) {
      return {
        isFlagged: true,
        reason: `Weather mismatch: heavy_rain but precip=${precip} mm/h`,
        checkName: 'weather_mismatch',
        facts: { trigger, precip_mm_h: precip },
      };
    }
  }

  if (trigger === 'severe_aqi') {
    const currentAqi =
      (rawApiData.current_aqi as number | undefined) ??
      ((rawApiData.hourly as { us_aqi?: (number | null)[] } | undefined)?.us_aqi ?? []).find(
        (v) => v != null,
      );
    const adaptiveThreshold = (rawApiData.adaptive_threshold as number | undefined) ?? 201;

    if (
      currentAqi != null &&
      typeof currentAqi === 'number' &&
      currentAqi < adaptiveThreshold * 0.8
    ) {
      return {
        isFlagged: true,
        reason: `Weather mismatch: severe_aqi claimed (threshold=${adaptiveThreshold}) but AQI=${currentAqi}`,
        checkName: 'weather_mismatch',
        facts: { trigger, current_aqi: currentAqi, adaptive_threshold: adaptiveThreshold },
      };
    }
  }

  return { isFlagged: false };
}

async function checkLocationVerification(
  supabase: SupabaseClient,
  claimId: string,
): Promise<FraudCheckResult> {
  const { data } = await supabase
    .from('claim_verifications')
    .select('status')
    .eq('claim_id', claimId)
    .limit(1);

  const v = data?.[0] as { status?: string } | undefined;
  if (v?.status === 'outside_geofence') {
    return {
      isFlagged: true,
      reason: 'Location verification: rider GPS outside event geofence',
      checkName: 'location_verification',
    };
  }
  return { isFlagged: false };
}

async function checkDeviceFingerprint(
  supabase: SupabaseClient,
  deviceFingerprint: string,
): Promise<FraudCheckResult> {
  if (!deviceFingerprint) return { isFlagged: false, checkName: 'device_fingerprint' };

  const oneHourAgo = new Date(
    Date.now() - FRAUD.DEVICE_FINGERPRINT_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await supabase
    .from('parametric_claims')
    .select('disruption_event_id')
    .eq('device_fingerprint', deviceFingerprint)
    .gte('created_at', oneHourAgo);

  if (!data || data.length < 2) {
    return { isFlagged: false, checkName: 'device_fingerprint' };
  }

  const eventIds = [
    ...new Set((data as Array<{ disruption_event_id: string }>).map((c) => c.disruption_event_id)),
  ];

  const { data: events } = await supabase
    .from('live_disruption_events')
    .select('geofence_polygon')
    .in('id', eventIds);

  if (!events || events.length < 2) {
    return { isFlagged: false, checkName: 'device_fingerprint' };
  }

  const points = (events as Array<{ geofence_polygon: unknown }>)
    .map((e) => {
      const g = e.geofence_polygon as { lat?: number; lng?: number };
      return { lat: g?.lat, lng: g?.lng };
    })
    .filter((p): p is { lat: number; lng: number } => p.lat != null && p.lng != null);

  if (points.length < 2) {
    return { isFlagged: false, checkName: 'device_fingerprint' };
  }

  let maxDist = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = haversineKm(points[i]!.lat, points[i]!.lng, points[j]!.lat, points[j]!.lng);
      if (dist > maxDist) maxDist = dist;
    }
  }

  const thresholdKm = FRAUD.DEVICE_FINGERPRINT_MIN_DISTANCE_DEG * 111;
  if (maxDist > thresholdKm) {
    return {
      isFlagged: true,
      reason: `Device fingerprint: same device in ${eventIds.length} distant zones within ${FRAUD.DEVICE_FINGERPRINT_WINDOW_HOURS}h`,
      checkName: 'device_fingerprint',
      facts: { event_ids: eventIds, window_hours: FRAUD.DEVICE_FINGERPRINT_WINDOW_HOURS },
    };
  }

  return { isFlagged: false, checkName: 'device_fingerprint' };
}

/** Row shape from `zone_baseline_stats` for normalized burst / baseline checks. */
export type ZoneBaselineSnapshot = {
  event_id: string;
  total_claims: number | null;
  rolling_avg_claims: number | null;
};

async function fetchZoneBaselineSnapshot(
  supabase: SupabaseClient,
  disruptionEventId: string,
): Promise<ZoneBaselineSnapshot | null> {
  try {
    const { data } = await supabase
      .from('zone_baseline_stats')
      .select('event_id, total_claims, rolling_avg_claims')
      .eq('event_id', disruptionEventId)
      .maybeSingle();

    if (!data) return null;
    const row = data as {
      event_id: string;
      total_claims: number | null;
      rolling_avg_claims: number | null;
    };
    return {
      event_id: row.event_id,
      total_claims: row.total_claims != null ? Number(row.total_claims) : null,
      rolling_avg_claims: row.rolling_avg_claims != null ? Number(row.rolling_avg_claims) : null,
    };
  } catch {
    return null;
  }
}

async function checkClusterAnomaly(
  supabase: SupabaseClient,
  disruptionEventId: string,
  baseline: ZoneBaselineSnapshot | null,
): Promise<FraudCheckResult> {
  const windowAgo = new Date(
    Date.now() - FRAUD.CLUSTER_ANOMALY_WINDOW_MIN * 60 * 1000,
  ).toISOString();

  const { count } = await supabase
    .from('parametric_claims')
    .select('id', { count: 'exact', head: true })
    .eq('disruption_event_id', disruptionEventId)
    .gte('created_at', windowAgo);

  const rolling =
    baseline?.rolling_avg_claims != null && Number.isFinite(baseline.rolling_avg_claims)
      ? Number(baseline.rolling_avg_claims)
      : null;
  const threshold = computeClusterBurstThreshold(rolling);
  const n = count ?? 0;
  const isFlagged = n >= threshold;

  const facts = {
    count: n,
    window_minutes: FRAUD.CLUSTER_ANOMALY_WINDOW_MIN,
    threshold,
    rolling_avg_claims: rolling,
  };

  if (isFlagged) {
    return {
      isFlagged: true,
      reason: `Cluster anomaly: ${n} claims in <${FRAUD.CLUSTER_ANOMALY_WINDOW_MIN} min (threshold ${threshold})`,
      checkName: 'cluster_anomaly',
      facts,
    };
  }

  return { isFlagged: false, checkName: 'cluster_anomaly', facts };
}

async function checkHistoricalBaseline(
  supabase: SupabaseClient,
  disruptionEventId: string,
  baseline: ZoneBaselineSnapshot | null,
): Promise<FraudCheckResult> {
  try {
    let row: { total_claims?: unknown; rolling_avg_claims?: unknown } | null = baseline
      ? { total_claims: baseline.total_claims, rolling_avg_claims: baseline.rolling_avg_claims }
      : null;

    if (!row) {
      const { data } = await supabase
        .from('zone_baseline_stats')
        .select('total_claims, rolling_avg_claims')
        .eq('event_id', disruptionEventId)
        .maybeSingle();
      row = data ?? null;
    }

    if (!row) {
      return {
        isFlagged: false,
        checkName: 'historical_baseline',
        facts: { note: 'no_baseline_row' },
      };
    }

    const avg = row.rolling_avg_claims != null ? Number(row.rolling_avg_claims) : NaN;
    const current = Number(row.total_claims ?? 0);

    if (!Number.isFinite(avg) || avg <= 0) {
      return {
        isFlagged: false,
        checkName: 'historical_baseline',
        facts: {
          current_claims: current,
          rolling_unavailable: true,
        },
      };
    }

    if (
      avg > 0 &&
      current > avg * FRAUD.HISTORICAL_BASELINE_MULTIPLIER &&
      current >= avg + FRAUD.HISTORICAL_BASELINE_MIN_DELTA
    ) {
      return {
        isFlagged: true,
        reason: `Historical baseline: ${current} claims vs. ${avg.toFixed(1)} avg (${((current / avg) * 100).toFixed(0)}% above baseline)`,
        checkName: 'historical_baseline',
        facts: {
          current_claims: current,
          rolling_avg_claims: avg,
          multiplier: FRAUD.HISTORICAL_BASELINE_MULTIPLIER,
          min_delta: FRAUD.HISTORICAL_BASELINE_MIN_DELTA,
        },
      };
    }

    return {
      isFlagged: false,
      checkName: 'historical_baseline',
      facts: {
        current_claims: current,
        rolling_avg_claims: avg,
        multiplier: FRAUD.HISTORICAL_BASELINE_MULTIPLIER,
      },
    };
  } catch {
    return { isFlagged: false, checkName: 'historical_baseline', facts: { error: 'query_failed' } };
  }
}

async function checkCrossProfileVelocity(
  supabase: SupabaseClient,
  profileId: string,
  disruptionEventId: string,
): Promise<FraudCheckResult> {
  try {
    // Get this profile's phone number
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', profileId)
      .single();

    if (!profile?.phone_number) {
      return { isFlagged: false, checkName: 'cross_profile_velocity' };
    }

    // Find other profiles with the same phone
    const { data: samePhoneProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', profile.phone_number)
      .neq('id', profileId);

    if (!samePhoneProfiles || samePhoneProfiles.length === 0) {
      return { isFlagged: false, checkName: 'cross_profile_velocity' };
    }

    // Check if any of those profiles already claimed for this event
    const otherProfileIds = samePhoneProfiles.map((p) => p.id);
    const { data: otherPolicies } = await supabase
      .from('weekly_policies')
      .select('id')
      .in('profile_id', otherProfileIds)
      .eq('is_active', true);

    if (!otherPolicies || otherPolicies.length === 0) {
      return { isFlagged: false, checkName: 'cross_profile_velocity' };
    }

    const otherPolicyIds = otherPolicies.map((p) => p.id);
    const { count } = await supabase
      .from('parametric_claims')
      .select('id', { count: 'exact', head: true })
      .in('policy_id', otherPolicyIds)
      .eq('disruption_event_id', disruptionEventId);

    if ((count ?? 0) > 0) {
      return {
        isFlagged: true,
        reason: `Cross-profile velocity: same phone number already claimed for this event`,
        checkName: 'cross_profile_velocity',
      };
    }
  } catch {
    // Gracefully degrade
  }

  return { isFlagged: false, checkName: 'cross_profile_velocity' };
}

/**
 * Payout destination anomalies:
 * - multiple profiles sharing the same `payment_routing_id`
 * - unusually high payout volume against that destination in a short window
 *
 * This is parametric-specific abuse because payouts are automated and can be targeted
 * via synthetic accounts sharing a payout destination.
 */
export async function checkPayoutDestinationAnomaly(
  supabase: SupabaseClient,
  profileId: string,
): Promise<FraudCheckResult> {
  try {
    const { data: p } = await supabase
      .from('profiles')
      .select('payment_routing_id')
      .eq('id', profileId)
      .single();

    const routingId =
      (p as { payment_routing_id?: string | null } | null)?.payment_routing_id ?? null;
    if (!routingId) {
      return { isFlagged: false, checkName: 'payout_destination_anomaly' };
    }

    const { data: peers } = await supabase
      .from('profiles')
      .select('id')
      .eq('payment_routing_id', routingId)
      .limit(25);

    const peerIds = (peers ?? []).map((row) => (row as { id: string }).id).filter(Boolean);
    const distinctProfiles = new Set(peerIds);
    const linked = distinctProfiles.size;

    const windowHours = 24;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('payout_ledger')
      .select('id', { count: 'exact', head: true })
      .in('profile_id', [...distinctProfiles])
      .gte('initiated_at', windowStart);

    const payout24 = count ?? 0;

    if (linked < 2) {
      return {
        isFlagged: false,
        checkName: 'payout_destination_anomaly',
        facts: { linked_profiles: linked, payout_count_last_24h: payout24 },
      };
    }

    if (linked >= FRAUD.PAYOUT_DEST_FLAG_MIN_PROFILES) {
      return {
        isFlagged: true,
        checkName: 'payout_destination_anomaly',
        reason:
          'Payout destination anomaly: several riders share the same payout destination — manual review',
        facts: {
          payment_routing_id: routingId,
          linked_profiles: linked,
          payout_count_last_24h: payout24,
        },
      };
    }

    // Exactly two profiles: hold only if payout velocity suggests stacking or farmed accounts.
    if (payout24 >= FRAUD.PAYOUT_DEST_2PARTY_MIN_PAYOUTS_24H) {
      return {
        isFlagged: true,
        checkName: 'payout_destination_anomaly',
        reason:
          'Payout destination anomaly: shared destination with elevated payout velocity in 24h',
        facts: {
          payment_routing_id: routingId,
          linked_profiles: linked,
          payout_count_last_24h: payout24,
        },
      };
    }

    return {
      isFlagged: false,
      checkName: 'payout_destination_anomaly',
      facts: {
        soft_duplicate_destination: true,
        payment_routing_id: routingId,
        linked_profiles: linked,
        payout_count_last_24h: payout24,
      },
    };
  } catch {
    // Gracefully degrade (missing columns / RLS / table)
  }

  return { isFlagged: false, checkName: 'payout_destination_anomaly' };
}

async function flagClaimAsFraud(
  supabase: SupabaseClient,
  claimId: string,
  reason: string,
): Promise<void> {
  await supabase
    .from('parametric_claims')
    .update({ is_flagged: true, flag_reason: reason })
    .eq('id', claimId);
}

/** Preloaded data for batch fraud checks (avoids N+1 per policy). */
export interface PreloadedFraudData {
  /** Policy IDs that already have a claim for this event (duplicate). */
  duplicateClaimPolicyIds: Set<string>;
  /** Claim count per policy in the rapid-claims window. */
  rapidClaimCountByPolicy: Map<string, number>;
}

/**
 * Preload duplicate and rapid-claims data for many policies and one event.
 * Call once before the policy loop, then pass to runAllFraudChecks.
 */
export async function preloadFraudData(
  supabase: SupabaseClient,
  policyIds: string[],
  disruptionEventId: string,
): Promise<PreloadedFraudData> {
  const duplicateClaimPolicyIds = new Set<string>();
  const rapidClaimCountByPolicy = new Map<string, number>();

  if (policyIds.length === 0) {
    return { duplicateClaimPolicyIds, rapidClaimCountByPolicy };
  }

  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - FRAUD.RAPID_CLAIMS_WINDOW_HOURS);

  const [duplicateRes, rapidRes] = await Promise.all([
    supabase
      .from('parametric_claims')
      .select('policy_id')
      .in('policy_id', policyIds)
      .eq('disruption_event_id', disruptionEventId),
    supabase
      .from('parametric_claims')
      .select('policy_id')
      .in('policy_id', policyIds)
      .gte('created_at', windowStart.toISOString()),
  ]);

  for (const row of duplicateRes.data ?? []) {
    const p = row as { policy_id: string };
    if (p.policy_id) duplicateClaimPolicyIds.add(p.policy_id);
  }

  for (const row of rapidRes.data ?? []) {
    const p = row as { policy_id: string };
    if (p.policy_id) {
      rapidClaimCountByPolicy.set(p.policy_id, (rapidClaimCountByPolicy.get(p.policy_id) ?? 0) + 1);
    }
  }

  return { duplicateClaimPolicyIds, rapidClaimCountByPolicy };
}

/**
 * Executes a preliminary synchronous sweep of fraud vectors to preemptively block invalid claims.
 * Evaluates core behavioral limits such as rapid velocity tracking and duplication sweeps.
 *
 * @param supabase - Admin client instance
 * @param policyId - Target policy identifier
 * @param disruptionEventId - The contextual disruption id
 * @param rawApiData - Real-time environmental metrics for data consistency verification
 * @param preloaded - Optional cached states to safely bypass N+1 request latencies
 * @returns Result object containing flag status and specific failure rationale
 */
export async function runAllFraudChecks(
  supabase: SupabaseClient,
  policyId: string,
  disruptionEventId: string,
  rawApiData?: Record<string, unknown> | null,
  preloaded?: PreloadedFraudData | null,
): Promise<FraudCheckResult> {
  let duplicate: FraudCheckResult;
  let rapid: FraudCheckResult;

  if (preloaded) {
    duplicate = preloaded.duplicateClaimPolicyIds.has(policyId)
      ? {
          isFlagged: true,
          reason: 'Duplicate: same policy + disruption event',
          checkName: 'duplicate_claim',
        }
      : { isFlagged: false };
    const count = preloaded.rapidClaimCountByPolicy.get(policyId) ?? 0;
    rapid =
      count >= FRAUD.RAPID_CLAIMS_THRESHOLD
        ? {
            isFlagged: true,
            reason: `Rapid claims: ${count} in ${FRAUD.RAPID_CLAIMS_WINDOW_HOURS}h (threshold ${FRAUD.RAPID_CLAIMS_THRESHOLD})`,
            checkName: 'rapid_claims',
          }
        : { isFlagged: false };
  } else {
    const [dup, rap] = await Promise.all([
      checkDuplicateClaim(supabase, policyId, disruptionEventId),
      checkRapidClaims(supabase, policyId),
    ]);
    duplicate = dup;
    rapid = rap;
  }

  if (duplicate.isFlagged) return duplicate;
  if (rapid.isFlagged) return rapid;

  if (rawApiData) {
    const weather = checkWeatherMismatch(rawApiData);
    if (weather.isFlagged) return weather;
  }

  return { isFlagged: false };
}

/**
 * Validates algorithmic GPS constraints to reject artificially spoofed satellite readings.
 *
 * @param accuracy - Raw accuracy radius generated by the hardware sensor (in meters)
 * @returns Result object indicating if the accuracy drops below acceptable algorithmic bounds
 */
export function checkGpsAccuracy(accuracy: number | null | undefined): FraudCheckResult {
  if (accuracy == null) return { isFlagged: false };
  if (accuracy > FRAUD.GPS_MAX_ACCURACY_METERS) {
    return {
      isFlagged: true,
      reason: `GPS accuracy too low: ${accuracy}m (max ${FRAUD.GPS_MAX_ACCURACY_METERS}m)`,
      checkName: 'gps_accuracy',
      facts: { accuracy_m: accuracy, max_accuracy_m: FRAUD.GPS_MAX_ACCURACY_METERS },
    };
  }
  return { isFlagged: false };
}

/**
 * Impossible travel check: flag if rider verified a claim at a distant location
 * too recently (e.g., >50 km apart within 30 minutes).
 * Rule uses `FRAUD.IMPOSSIBLE_TRAVEL_*`, aligned with the `impossible_travel.joblib` baseline (~96% holdout on synthetic data) in `models/artifacts/`.
 */
export async function checkImpossibleTravel(
  supabase: SupabaseClient,
  profileId: string,
  lat: number,
  lng: number,
): Promise<FraudCheckResult> {
  const windowAgo = new Date(
    Date.now() - FRAUD.IMPOSSIBLE_TRAVEL_MINUTES * 60 * 1000,
  ).toISOString();

  const { data: recentVerifications } = await supabase
    .from('claim_verifications')
    .select('verified_lat, verified_lng, verified_at')
    .eq('profile_id', profileId)
    .gte('verified_at', windowAgo)
    .order('verified_at', { ascending: false })
    .limit(5);

  if (!recentVerifications || recentVerifications.length === 0) {
    return { isFlagged: false };
  }

  for (const v of recentVerifications) {
    const vLat = Number(v.verified_lat);
    const vLng = Number(v.verified_lng);
    if (!Number.isFinite(vLat) || !Number.isFinite(vLng)) continue;

    const distKm = haversineKm(lat, lng, vLat, vLng);
    if (distKm > FRAUD.IMPOSSIBLE_TRAVEL_KM) {
      return {
        isFlagged: true,
        reason: `Impossible travel: ${distKm.toFixed(1)}km in <${FRAUD.IMPOSSIBLE_TRAVEL_MINUTES}min`,
        checkName: 'impossible_travel',
        facts: { distance_km: Number(distKm.toFixed(2)), threshold_km: FRAUD.IMPOSSIBLE_TRAVEL_KM },
      };
    }
  }

  return { isFlagged: false };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Post-claim asynchronous fraud analysis suite.
 * Aggregates behavioral anomalies such as synchronized claim clusters, historical baseline deviations,
 * multi-device fingerprinting overlaps, and cross-profile network velocity.
 *
 * @param supabase - Admin client instance
 * @param claimId - The target claim to evaluate
 * @param disruptionEventId - Associated disruption context
 * @param deviceFingerprint - Hardware identifier checksum
 * @param profileId - Subject rider profile identifier
 * @returns Evaluation metrics orchestrating if the subsequent backend payout must be administratively paused
 */
export async function runExtendedFraudChecks(
  supabase: SupabaseClient,
  claimId: string,
  disruptionEventId: string,
  deviceFingerprint?: string,
  profileId?: string,
): Promise<FraudCheckResult> {
  const baseline = await fetchZoneBaselineSnapshot(supabase, disruptionEventId);

  const checks: Promise<FraudCheckResult>[] = [
    checkClusterAnomaly(supabase, disruptionEventId, baseline),
    checkHistoricalBaseline(supabase, disruptionEventId, baseline),
  ];

  if (deviceFingerprint) {
    checks.push(checkDeviceFingerprint(supabase, deviceFingerprint));
  }

  if (profileId) {
    checks.push(checkCrossProfileVelocity(supabase, profileId, disruptionEventId));
  }

  const results = await Promise.all(checks);
  const aggregated = aggregateExtendedFraudRisk(results);
  await persistClaimFraudRisk(supabase, claimId, aggregated);

  const flagged = results.find((r) => r.isFlagged);

  if (flagged) {
    await flagClaimAsFraud(supabase, claimId, flagged.reason ?? 'Extended fraud check');
    return flagged;
  }

  return { isFlagged: false };
}
