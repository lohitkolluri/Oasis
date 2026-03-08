/**
 * Policy matching, fraud checks, claim creation and payouts for a single disruption event.
 */

import { DEFAULT_ZONE, TRIGGERS } from '@/lib/config/constants';
import {
  preloadFraudData,
  runAllFraudChecks,
  runExtendedFraudChecks,
} from '@/lib/fraud/detector';
import { currentWeekMonday, isWithinCircle } from '@/lib/utils/geo';
import type {
  ProcessTriggerResult,
  SupabaseAdmin,
  TriggerCandidate,
} from '@/lib/adjudicator/types';
import { addDays, toDateString } from '@/lib/utils/date';

export interface ProcessClaimsOptions {
  /** When set (demo), only this profile gets the claim/payout; zone check is skipped for them. */
  restrictToProfileId?: string;
}

/**
 * Match policies in geofence, run fraud checks, create claims and record payouts.
 * Call after the disruption event has been inserted.
 */
export async function processClaimsForEvent(
  supabase: SupabaseAdmin,
  eventId: string,
  candidate: TriggerCandidate,
  options?: ProcessClaimsOptions,
): Promise<ProcessTriggerResult> {
  const today = toDateString(new Date());
  const geofence = candidate.geofence;
  const eventLat = geofence?.lat ?? DEFAULT_ZONE.lat;
  const eventLng = geofence?.lng ?? DEFAULT_ZONE.lng;
  const radiusKm =
    geofence?.radius_km ?? TRIGGERS.DEFAULT_GEOFENCE_RADIUS_KM;
  const restrictToProfileId = options?.restrictToProfileId;

  // Policies are often created for "next week" (Mon–Sun). For normal runs we require today in [week_start, week_end].
  // For demo with a selected rider, also include "next week" policies: week_start <= today+7, week_end >= today.
  const weekStartUpper = restrictToProfileId ? addDays(today, 7) : today;

  let query = supabase
    .from('weekly_policies')
    .select(
      'id, profile_id, plan_id, plan_packages(payout_per_claim_inr, max_claims_per_week)',
    )
    .eq('is_active', true)
    .lte('week_start_date', weekStartUpper)
    .gte('week_end_date', today);

  if (restrictToProfileId) {
    query = query.eq('profile_id', restrictToProfileId);
  }

  const { data: policies } = await query;

  if (!policies || policies.length === 0) {
    return { claimsCreated: 0, payoutsInitiated: 0, eventId };
  }

  const policyProfileIds = [...new Set(policies.map((p) => p.profile_id))];
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, zone_latitude, zone_longitude, phone_number')
    .in('id', policyProfileIds);

  const profileMap = new Map(
    (allProfiles ?? []).map((p) => [
      p.id,
      {
        lat: p.zone_latitude as number | null,
        lng: p.zone_longitude as number | null,
        phone: p.phone_number as string | null,
      },
    ]),
  );

  const weekStart = currentWeekMonday().toISOString();
  const policyIds = policies.map((p) => p.id);
  const { data: existingClaims } = await supabase
    .from('parametric_claims')
    .select('policy_id')
    .in('policy_id', policyIds)
    .gte('created_at', weekStart);

  const claimCountMap = new Map<string, number>();
  for (const c of existingClaims ?? []) {
    claimCountMap.set(
      c.policy_id,
      (claimCountMap.get(c.policy_id) ?? 0) + 1,
    );
  }

  const preloadedFraud = await preloadFraudData(
    supabase,
    policyIds,
    eventId,
  );

  let claimsCreated = 0;
  let payoutsInitiated = 0;
  let payoutFailures = 0;
  const paidPhones = new Set<string>();

  for (const policy of policies) {
    const plan = policy.plan_packages as {
      payout_per_claim_inr?: number;
      max_claims_per_week?: number;
    } | null;
    const payoutAmount =
      plan?.payout_per_claim_inr != null
        ? Number(plan.payout_per_claim_inr)
        : 400;
    const maxClaimsPerWeek = plan?.max_claims_per_week ?? 3;

    const profile = profileMap.get(policy.profile_id);
    if (!restrictToProfileId && profile?.lat != null && profile?.lng != null) {
      if (
        !isWithinCircle(
          profile.lat,
          profile.lng,
          eventLat,
          eventLng,
          radiusKm,
        )
      ) {
        continue;
      }
    }

    const weekClaimCount = claimCountMap.get(policy.id) ?? 0;
    if (weekClaimCount >= maxClaimsPerWeek) continue;

    if (profile?.phone && paidPhones.has(profile.phone)) continue;

    const { isFlagged } = await runAllFraudChecks(
      supabase,
      policy.id,
      eventId,
      candidate.type === 'weather' ? candidate.raw : undefined,
      preloadedFraud,
    );
    if (isFlagged) continue;

    const { data: claimData, error: claimErr } = await supabase
      .from('parametric_claims')
      .insert({
        policy_id: policy.id,
        disruption_event_id: eventId,
        payout_amount_inr: payoutAmount,
        status: 'pending_verification',
        is_flagged: false,
      })
      .select('id')
      .single();

    if (!claimErr && claimData) {
      claimsCreated++;
      if (profile?.phone) paidPhones.add(profile.phone);
      await runExtendedFraudChecks(
        supabase,
        claimData.id,
        eventId,
        undefined,
      );
      // Payout: rider must verify location (see verify-location API). When the app is open
      // on mobile, RealtimeNotifications auto-requests GPS and POSTs to verify-location so
      // payout can be processed without the rider tapping "Verify". Otherwise they verify manually.

      const eventLabel =
        candidate.subtype === 'extreme_heat'
          ? 'Extreme heat'
          : candidate.subtype === 'heavy_rain'
            ? 'Heavy rain'
            : candidate.subtype === 'severe_aqi'
              ? 'Severe AQI'
              : candidate.subtype === 'zone_curfew'
                ? 'Zone curfew'
                : candidate.subtype === 'traffic_gridlock'
                  ? 'Traffic gridlock'
                  : 'Disruption';
      const { error: notifErr } = await supabase.from('rider_notifications').insert({
        profile_id: policy.profile_id,
        title: `Claim created — verify location`,
        body: `${eventLabel} in your zone. Verify your location in the app to receive ₹${payoutAmount}.`,
        type: 'payout',
        metadata: { claim_id: claimData.id, amount_inr: payoutAmount, subtype: candidate.subtype },
      });
      if (notifErr) {
        // Table may not exist yet or RLS; don't fail the claim
      }
    }
  }

  return {
    claimsCreated,
    payoutsInitiated,
    payoutFailures,
    eventId,
  };
}
