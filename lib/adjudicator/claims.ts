/**
 * Policy matching, fraud checks, claim creation and payouts for a single disruption event.
 */

import { payoutLadderFromContext, triggersFromContext } from '@/lib/adjudicator/rule-context';
import type {
  ProcessTriggerResult,
  SupabaseAdmin,
  TriggerCandidate,
} from '@/lib/adjudicator/types';
import { createClaimFromTrigger, getWeeklyClaimCounts } from '@/lib/claims/engine';
import { DEFAULT_ZONE, FRAUD, PAYOUT_BALANCE, PAYOUT_FALLBACK_INR } from '@/lib/config/constants';
import { preloadFraudData, runAllFraudChecks, runExtendedFraudChecks } from '@/lib/fraud/detector';
import { createAutomatedHold } from '@/lib/fraud/holds';
import { dispatchWebPushForRiderNotifications } from '@/lib/notifications/web-push-dispatch';
import { payoutForSeverity } from '@/lib/parametric-rules/payout-ladder';
import { addDays, toDateString } from '@/lib/utils/date';
import { isWithinCircle } from '@/lib/utils/geo';

export interface ProcessClaimsOptions {
  /** When set (demo), only this profile gets the claim/payout; zone check is skipped for them. */
  restrictToProfileId?: string;
}

function applyPlanBalanceCap(args: {
  basePayoutInr: number;
  severityPayoutInr: number;
  weeklyPremiumInr: number | null;
  maxClaimsPerWeek: number;
}): number {
  const { basePayoutInr, severityPayoutInr, weeklyPremiumInr, maxClaimsPerWeek } = args;
  if (weeklyPremiumInr == null || !Number.isFinite(weeklyPremiumInr) || weeklyPremiumInr <= 0) {
    return severityPayoutInr;
  }

  const safeMaxClaims = Math.max(1, Math.floor(maxClaimsPerWeek));
  const perClaimCapByPremium = Math.round(
    weeklyPremiumInr * PAYOUT_BALANCE.MAX_PER_CLAIM_PREMIUM_MULTIPLIER,
  );
  const perClaimCapByWeeklyBudget = Math.round(
    (weeklyPremiumInr * PAYOUT_BALANCE.MAX_WEEKLY_PREMIUM_MULTIPLIER) / safeMaxClaims,
  );

  const balancedCap = Math.max(
    basePayoutInr,
    Math.min(perClaimCapByPremium, perClaimCapByWeeklyBudget),
  );
  return Math.min(severityPayoutInr, balancedCap);
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
  const T = triggersFromContext();
  const ladder = payoutLadderFromContext();
  const radiusKm = geofence?.radius_km ?? T.DEFAULT_GEOFENCE_RADIUS_KM;
  const restrictToProfileId = options?.restrictToProfileId;

  // Policies are often created for "next week" (Mon–Sun). For normal runs we require today in [week_start, week_end].
  // For demo with a selected rider, also include "next week" policies: week_start <= today+7, week_end >= today.
  const weekStartUpper = restrictToProfileId ? addDays(today, 7) : today;

  let query = supabase
    .from('weekly_policies')
    .select(
      'id, profile_id, plan_id, weekly_premium_inr, payment_status, plan_packages(payout_per_claim_inr, max_claims_per_week)',
    )
    // Treat paid/demo rows within the current week as eligible even if `is_active`
    // lags briefly after payment verification transitions.
    .or('is_active.eq.true,payment_status.in.(paid,demo)')
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

  const policyIds = policies.map((p) => p.id);
  const claimCountMap = await getWeeklyClaimCounts(supabase, policyIds);

  const preloadedFraud = await preloadFraudData(supabase, policyIds, eventId);

  let claimsCreated = 0;
  let payoutsInitiated = 0;
  let payoutFailures = 0;
  const paidPhones = new Set<string>();
  const isDemo = candidate.raw?.demo === true || candidate.raw?.source === 'admin_demo_mode';
  const pendingNotifications: Array<{
    profile_id: string;
    title: string;
    body: string;
    type: string;
    metadata: Record<string, unknown>;
  }> = [];

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

  for (const policyRow of policies) {
    const plan = policyRow.plan_packages as {
      payout_per_claim_inr?: number;
      max_claims_per_week?: number;
    } | null;
    const basePayout =
      plan?.payout_per_claim_inr != null ? Number(plan.payout_per_claim_inr) : PAYOUT_FALLBACK_INR;
    const maxClaimsPerWeek = plan?.max_claims_per_week ?? 3;
    const severityPayout = payoutForSeverity(basePayout, candidate.severity, ladder);
    const payoutAmount = applyPlanBalanceCap({
      basePayoutInr: basePayout,
      severityPayoutInr: severityPayout,
      weeklyPremiumInr:
        policyRow.weekly_premium_inr != null ? Number(policyRow.weekly_premium_inr) : null,
      maxClaimsPerWeek,
    });

    const profile = profileMap.get(policyRow.profile_id);
    if (!restrictToProfileId) {
      // A rider must have a configured delivery zone to be eligible for geofenced payouts.
      // Without this guard, riders missing lat/lng silently fall through the geofence check
      // and receive claims for events anywhere in the country.
      if (profile?.lat == null || profile?.lng == null) {
        continue;
      }
      if (!isWithinCircle(profile.lat, profile.lng, eventLat, eventLng, radiusKm)) {
        continue;
      }
    }

    if (profile?.phone && paidPhones.has(profile.phone)) continue;

    const preClaimCheck = await runAllFraudChecks(
      supabase,
      policyRow.id,
      eventId,
      candidate.type === 'weather' ? candidate.raw : undefined,
      preloadedFraud,
    );
    if (preClaimCheck.isFlagged) {
      await createAutomatedHold({
        supabase,
        stage: 'pre_claim',
        profileId: policyRow.profile_id,
        policyId: policyRow.id,
        disruptionEventId: eventId,
        reason: preClaimCheck.reason ?? 'Automated hold: claim creation blocked by abuse signals',
        checkName: preClaimCheck.checkName ?? 'pre_claim_abuse',
        facts: {
          policy_id: policyRow.id,
          disruption_event_id: eventId,
          subtype: candidate.subtype ?? null,
          ...(preClaimCheck.facts ? { check_facts: preClaimCheck.facts } : {}),
        },
      });
      continue;
    }

    const policy = {
      id: policyRow.id,
      profile_id: policyRow.profile_id,
      plan_id: policyRow.plan_id,
      plan_packages: plan,
    };

    const created = await createClaimFromTrigger({
      supabase,
      policy,
      disruptionEventId: eventId,
      payoutAmountInr: payoutAmount,
      maxClaimsPerWeek,
      preExistingWeekCounts: claimCountMap,
      phoneNumber: profile?.phone ?? null,
      isDemo,
    });

    if (!created) {
      await supabase.from('system_logs').insert({
        event_type: 'claim_insert_failed',
        severity: 'error',
        metadata: {
          policy_id: policyRow.id,
          profile_id: policyRow.profile_id,
          event_id: eventId,
          payout_amount_inr: payoutAmount,
        },
      });
      continue;
    }

    if (created.skippedReason) {
      continue;
    }

    if (created.claim) {
      claimsCreated++;
      if (profile?.phone) paidPhones.add(profile.phone);
      await runExtendedFraudChecks(
        supabase,
        created.claim.id,
        eventId,
        undefined,
        policy.profile_id,
      );
      if (created.payoutInitiated) {
        payoutsInitiated++;
      }
      if (created.payoutFailed) {
        payoutFailures++;
      }

      pendingNotifications.push({
        profile_id: policy.profile_id,
        title: isDemo
          ? `Demo: ₹${payoutAmount} credited to your wallet`
          : `Claim created. Verify location`,
        body: isDemo
          ? `${eventLabel} (demo). Payout recorded to your wallet.`
          : `${eventLabel} in your zone. Verify your location within ${FRAUD.VERIFY_WINDOW_HOURS}h to receive ₹${payoutAmount}.`,
        type: 'payout',
        metadata: {
          claim_id: created?.claim.id,
          amount_inr: payoutAmount,
          subtype: candidate.subtype,
        },
      });

      if (!isDemo) {
        const reminders = [
          {
            hours: 12,
            title: 'Reminder: verify your location',
            body: `You have ${FRAUD.VERIFY_WINDOW_HOURS - 12}h left to verify your location for ₹${payoutAmount} payout.`,
          },
          {
            hours: 20,
            title: 'Urgent: verify location soon',
            body: `Only ${FRAUD.VERIFY_WINDOW_HOURS - 20}h remaining to verify your location and claim ₹${payoutAmount}.`,
          },
        ];
        for (const reminder of reminders) {
          pendingNotifications.push({
            profile_id: policy.profile_id,
            title: reminder.title,
            body: reminder.body,
            type: 'reminder',
            metadata: {
              claim_id: created?.claim.id,
              amount_inr: payoutAmount,
              scheduled_for: new Date(Date.now() + reminder.hours * 60 * 60 * 1000).toISOString(),
              reminder_hours: reminder.hours,
            },
          });
        }
      }
    }
  }

  if (pendingNotifications.length > 0) {
    const { error: notifErr } = await supabase
      .from('rider_notifications')
      .insert(pendingNotifications);
    if (notifErr) {
      await supabase
        .from('system_logs')
        .insert({
          event_type: 'notification_insert_failed',
          severity: 'warning',
          metadata: {
            event_id: eventId,
            count: pendingNotifications.length,
            error: notifErr.message,
          },
        })
        .then(
          () => {},
          () => {},
        );
    } else {
      await dispatchWebPushForRiderNotifications(supabase, pendingNotifications);
    }
  }

  return {
    claimsCreated,
    payoutsInitiated,
    payoutFailures,
    eventId,
  };
}
