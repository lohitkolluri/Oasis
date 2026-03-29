/**
 * GET /api/admin/reserves-cohorts
 *
 * Weekly cohort view: earned premium, max contractual exposure, realized payouts,
 * zone/peril breakdown, and optional stress (+N lockdown-equivalent days vs. headroom).
 */

import { WEEKLY_POLICY_EARNED_PREMIUM_STATUSES } from '@/lib/config/constants';
import { getReserveWeeklyPayoutCapInr } from '@/lib/reserves/limits';
import {
  buildWeeklyCohorts,
  getCohortCutoffWeekStart,
  type ReservesCohortsPayload,
  type WeeklyCohortRow,
} from '@/lib/reserves/weekly-cohorts';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function firstOrNull<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

const DISCLAIMER =
  'Scenario stress is illustrative liquidity math only — not statutory IBNR or audited reserves. ' +
  'Extra days apply linearly to remaining weekly headroom (max exposure minus realized payouts).';

export const GET = withAdminAuth(async (_ctx, request) => {
  const url = new URL(request.url);
  const weeks = Math.min(
    52,
    Math.max(1, parseInt(url.searchParams.get('weeks') ?? '8', 10) || 8),
  );
  const extraTriggerDays = Math.min(
    14,
    Math.max(0, parseInt(url.searchParams.get('extraDays') ?? '0', 10) || 0),
  );

  const cutoffWeekStart = getCohortCutoffWeekStart(weeks);
  const weeklyPayoutCapInr = getReserveWeeklyPayoutCapInr();

  const admin = createAdminClient();

  const { data: policiesRaw, error: polErr } = await admin
    .from('weekly_policies')
    .select(
      `
      id,
      week_start_date,
      week_end_date,
      weekly_premium_inr,
      plan_id,
      profile_id,
      profiles ( primary_zone_geofence ),
      plan_packages ( payout_per_claim_inr, max_claims_per_week )
    `,
    )
    .gte('week_start_date', cutoffWeekStart)
    .in('payment_status', [...WEEKLY_POLICY_EARNED_PREMIUM_STATUSES]);

  if (polErr) {
    return NextResponse.json({ error: polErr.message }, { status: 500 });
  }

  const policiesNormalized = (policiesRaw ?? []).map((row) => ({
      id: row.id as string,
      week_start_date: row.week_start_date as string,
      week_end_date: (row.week_end_date as string | null) ?? null,
      weekly_premium_inr: row.weekly_premium_inr as number | string | null,
      profiles: firstOrNull(row.profiles as { primary_zone_geofence: unknown } | { primary_zone_geofence: unknown }[] | null),
      plan_packages: firstOrNull(
        row.plan_packages as
          | {
              payout_per_claim_inr: number | string | null;
              max_claims_per_week: number | string | null;
            }
          | {
              payout_per_claim_inr: number | string | null;
              max_claims_per_week: number | string | null;
            }[]
          | null,
      ) as {
        payout_per_claim_inr: number | string | null;
        max_claims_per_week: number | string | null;
      } | null,
    }));

  const policyIds = policiesNormalized.map((p) => p.id);

  let claimsNormalized: Parameters<typeof buildWeeklyCohorts>[0]['claims'] = [];

  if (policyIds.length > 0) {
    const { data: claimsRaw, error: clErr } = await admin
      .from('parametric_claims')
      .select(
        `
        policy_id,
        payout_amount_inr,
        live_disruption_events ( event_type )
      `,
      )
      .in('policy_id', policyIds);

    if (clErr) {
      return NextResponse.json({ error: clErr.message }, { status: 500 });
    }

    claimsNormalized = (claimsRaw ?? []).map((c) => ({
      policy_id: c.policy_id as string,
      payout_amount_inr: c.payout_amount_inr as number | string | null,
      live_disruption_events: firstOrNull(
        c.live_disruption_events as { event_type: string | null } | { event_type: string | null }[] | null,
      ),
    }));
  }

  const cohorts: WeeklyCohortRow[] = buildWeeklyCohorts({
    policies: policiesNormalized,
    claims: claimsNormalized,
    extraTriggerDays,
    weeklyPayoutCapInr,
  });

  const payload: ReservesCohortsPayload = {
    cohorts,
    meta: {
      weeksRequested: weeks,
      extraTriggerDays,
      weeklyPayoutCapInr,
      cutoffWeekStart,
    },
    disclaimer: DISCLAIMER,
  };

  return NextResponse.json(payload);
});
