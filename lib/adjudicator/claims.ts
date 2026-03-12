/**
 * Policy matching, fraud checks, claim creation and payouts for a single disruption event.
 */

import { DEFAULT_ZONE, FRAUD, PAYOUT_FALLBACK_INR, TRIGGERS } from '@/lib/config/constants';
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
import { simulatePayout } from '@/lib/adjudicator/payouts';

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
  const isDemo = candidate.raw?.demo === true || candidate.raw?.source === 'admin_demo_mode';

  for (const policy of policies) {
    const plan = policy.plan_packages as {
      payout_per_claim_inr?: number;
      max_claims_per_week?: number;
    } | null;
    const payoutAmount =
      plan?.payout_per_claim_inr != null
        ? Number(plan.payout_per_claim_inr)
        : PAYOUT_FALLBACK_INR;
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
        policy.profile_id,
      );

      // Demo mode: auto-record payout so ledger has a row and demo shows "1 payout(s)"
      if (isDemo) {
        const payoutOk = await simulatePayout(
          supabase,
          claimData.id,
          policy.profile_id,
          payoutAmount,
        );
        if (payoutOk) {
          payoutsInitiated++;
          await supabase
            .from('parametric_claims')
            .update({
              status: 'paid',
              gateway_transaction_id: `oasis_demo_${Date.now()}_${claimData.id.slice(0, 8)}`,
            })
            .eq('id', claimData.id);
        } else {
          payoutFailures++;
        }
      }

      // Payout (non-demo): rider must verify location (see verify-location API). When the app is open
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
        title: isDemo
          ? `Demo: claim paid — ₹${payoutAmount} credited`
          : `Claim created — verify location`,
        body: isDemo
          ? `${eventLabel} (demo). Payout recorded to your wallet.`
          : `${eventLabel} in your zone. Verify your location within ${FRAUD.VERIFY_WINDOW_HOURS}h to receive ₹${payoutAmount}.`,
        type: 'payout',
        metadata: { claim_id: claimData.id, amount_inr: payoutAmount, subtype: candidate.subtype },
      });
      if (notifErr) {
        // Table may not exist yet or RLS; don't fail the claim
      }

      // Schedule verification reminder notifications at 12h and 20h after claim creation
      if (!isDemo) {
        const reminders = [
          { hours: 12, title: 'Reminder: verify your location', body: `You have ${FRAUD.VERIFY_WINDOW_HOURS - 12}h left to verify your location for ₹${payoutAmount} payout.` },
          { hours: 20, title: 'Urgent: verify location soon', body: `Only ${FRAUD.VERIFY_WINDOW_HOURS - 20}h remaining to verify your location and claim ₹${payoutAmount}.` },
        ];
        for (const reminder of reminders) {
          const scheduledAt = new Date(Date.now() + reminder.hours * 60 * 60 * 1000).toISOString();
          await supabase.from('rider_notifications').insert({
            profile_id: policy.profile_id,
            title: reminder.title,
            body: reminder.body,
            type: 'reminder',
            metadata: {
              claim_id: claimData.id,
              amount_inr: payoutAmount,
              scheduled_for: scheduledAt,
              reminder_hours: reminder.hours,
            },
          }).then(() => {}, () => {});
        }
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
