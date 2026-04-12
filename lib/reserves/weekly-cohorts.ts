import { PAYOUT_FALLBACK_INR } from '@/lib/config/constants';
import {
  addCalendarDaysIST,
  getISTCurrentCoverageWeekMondayStart,
  getISTDateString,
} from '@/lib/datetime/ist';

export type WeeklyCohortRow = {
  weekStart: string;
  weekEnd: string | null;
  earnedPremiumInr: number;
  policyCount: number;
  cohortMaxExposureInr: number;
  realizedPayoutInr: number;
  headroomInr: number;
  incrementalStressInr: number;
  stressedTotalPayoutInr: number;
  liquidityGapVsPremiumInr: number;
  utilizationOfCapPct: number;
  stressedUtilizationOfCapPct: number;
  byZone: Array<{
    zone: string;
    policyCount: number;
    earnedPremiumInr: number;
    maxExposureInr: number;
    realizedPayoutInr: number;
  }>;
  byPeril: Array<{
    peril: string;
    claimCount: number;
    realizedPayoutInr: number;
  }>;
};

export type ReservesCohortsPayload = {
  cohorts: WeeklyCohortRow[];
  meta: {
    weeksRequested: number;
    extraTriggerDays: number;
    weeklyPayoutCapInr: number;
    cutoffWeekStart: string;
  };
  disclaimer: string;
};

function zoneKeyFromProfileGeofence(
  raw: unknown,
): string {
  if (raw == null) return 'Unspecified zone';
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const v =
      o.name ?? o.label ?? o.zone_name ?? o.city;
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return 'Unspecified zone';
}

type PlanCap = { payoutPerClaimInr: number; maxClaimsPerWeek: number };

function policyMaxExposureInr(plan: PlanCap | null): number {
  if (!plan) {
    return PAYOUT_FALLBACK_INR;
  }
  const per = Math.max(0, plan.payoutPerClaimInr);
  const n = Math.max(1, plan.maxClaimsPerWeek);
  return Math.round(per * n);
}

function stressIncrementalInr(extraTriggerDays: number, headroomInr: number): number {
  const d = Math.max(0, Math.min(14, extraTriggerDays));
  return Math.round((d / 7) * Math.max(0, headroomInr));
}

export function buildWeeklyCohorts(params: {
  policies: Array<{
    id: string;
    week_start_date: string;
    week_end_date: string | null;
    weekly_premium_inr: number | string | null;
    profiles: { primary_zone_geofence: unknown } | null;
    plan_packages: {
      payout_per_claim_inr: number | string | null;
      max_claims_per_week: number | string | null;
    } | null;
  }>;
  claims: Array<{
    policy_id: string;
    payout_amount_inr: number | string | null;
    live_disruption_events: { event_type: string | null } | null;
  }>;
  extraTriggerDays: number;
  weeklyPayoutCapInr: number;
}): WeeklyCohortRow[] {
  const { policies, claims, extraTriggerDays, weeklyPayoutCapInr } = params;

  const planCapByPolicyId = new Map<string, PlanCap | null>();
  const weekByPolicyId = new Map<string, string>();
  const zoneByPolicyId = new Map<string, string>();

  for (const p of policies) {
    const week = p.week_start_date;
    weekByPolicyId.set(p.id, week);
    zoneByPolicyId.set(p.id, zoneKeyFromProfileGeofence(p.profiles?.primary_zone_geofence));

    const pkg = p.plan_packages;
    if (pkg && pkg.payout_per_claim_inr != null && pkg.max_claims_per_week != null) {
      planCapByPolicyId.set(p.id, {
        payoutPerClaimInr: Number(pkg.payout_per_claim_inr),
        maxClaimsPerWeek: Number(pkg.max_claims_per_week),
      });
    } else {
      planCapByPolicyId.set(p.id, null);
    }
  }

  const cohortKeys = new Set<string>();
  for (const p of policies) cohortKeys.add(p.week_start_date);

  const realizedByPolicy = new Map<string, number>();
  const perilAggByWeek = new Map<string, Map<string, { count: number; payout: number }>>();

  for (const c of claims) {
    const pid = c.policy_id;
    const week = weekByPolicyId.get(pid);
    if (!week) continue;

    const amt = Number(c.payout_amount_inr ?? 0);
    realizedByPolicy.set(pid, (realizedByPolicy.get(pid) ?? 0) + amt);

    const perilRaw = c.live_disruption_events?.event_type;
    const peril =
      typeof perilRaw === 'string' && perilRaw.trim() ? perilRaw.trim() : 'unknown';

    if (!perilAggByWeek.has(week)) perilAggByWeek.set(week, new Map());
    const m = perilAggByWeek.get(week)!;
    const prev = m.get(peril) ?? { count: 0, payout: 0 };
    m.set(peril, { count: prev.count + 1, payout: prev.payout + amt });
  }

  const rows: WeeklyCohortRow[] = [];

  for (const weekStart of Array.from(cohortKeys).sort((a, b) => b.localeCompare(a))) {
    const weekPolicies = policies.filter((p) => p.week_start_date === weekStart);
    if (weekPolicies.length === 0) continue;

    let earnedPremiumInr = 0;
    let cohortMaxExposureInr = 0;
    let realizedPayoutInr = 0;

    const zoneMap = new Map<
      string,
      { policyCount: number; premium: number; maxExp: number; payout: number }
    >();

    let weekEnd: string | null = null;

    for (const p of weekPolicies) {
      const prem = Number(p.weekly_premium_inr ?? 0);
      earnedPremiumInr += prem;
      const maxExp = policyMaxExposureInr(planCapByPolicyId.get(p.id) ?? null);
      cohortMaxExposureInr += maxExp;
      const r = realizedByPolicy.get(p.id) ?? 0;
      realizedPayoutInr += r;

      if (p.week_end_date) weekEnd = p.week_end_date;

      const z = zoneByPolicyId.get(p.id) ?? 'Unspecified zone';
      const zb = zoneMap.get(z) ?? {
        policyCount: 0,
        premium: 0,
        maxExp: 0,
        payout: 0,
      };
      zb.policyCount += 1;
      zb.premium += prem;
      zb.maxExp += maxExp;
      zb.payout += r;
      zoneMap.set(z, zb);
    }

    const headroomInr = Math.max(0, cohortMaxExposureInr - realizedPayoutInr);
    const incrementalStressInr = stressIncrementalInr(extraTriggerDays, headroomInr);
    const stressedTotalPayoutInr = realizedPayoutInr + incrementalStressInr;
    const liquidityGapVsPremiumInr = stressedTotalPayoutInr - earnedPremiumInr;
    const utilizationOfCapPct =
      weeklyPayoutCapInr > 0
        ? Math.round((realizedPayoutInr / weeklyPayoutCapInr) * 1000) / 10
        : 0;
    const stressedUtilizationOfCapPct =
      weeklyPayoutCapInr > 0
        ? Math.round((stressedTotalPayoutInr / weeklyPayoutCapInr) * 1000) / 10
        : 0;

    const perilMap = perilAggByWeek.get(weekStart) ?? new Map();
    const byPeril = Array.from(perilMap.entries())
      .map(([peril, v]) => ({
        peril,
        claimCount: v.count,
        realizedPayoutInr: Math.round(v.payout),
      }))
      .sort((a, b) => b.realizedPayoutInr - a.realizedPayoutInr);

    const byZone = Array.from(zoneMap.entries())
      .map(([zone, v]) => ({
        zone,
        policyCount: v.policyCount,
        earnedPremiumInr: Math.round(v.premium),
        maxExposureInr: Math.round(v.maxExp),
        realizedPayoutInr: Math.round(v.payout),
      }))
      .sort((a, b) => b.maxExposureInr - a.maxExposureInr);

    rows.push({
      weekStart,
      weekEnd,
      earnedPremiumInr: Math.round(earnedPremiumInr),
      policyCount: weekPolicies.length,
      cohortMaxExposureInr: Math.round(cohortMaxExposureInr),
      realizedPayoutInr: Math.round(realizedPayoutInr),
      headroomInr: Math.round(headroomInr),
      incrementalStressInr,
      stressedTotalPayoutInr,
      liquidityGapVsPremiumInr,
      utilizationOfCapPct,
      stressedUtilizationOfCapPct,
      byZone,
      byPeril,
    });
  }

  return rows;
}

/** Earliest Monday YYYY-MM-DD included when requesting `weeksBack` cohorts (IST coverage weeks). */
export function getCohortCutoffWeekStart(weeksBack: number): string {
  const n = Math.max(1, Math.min(52, weeksBack));
  const mondayYmd = getISTDateString(getISTCurrentCoverageWeekMondayStart());
  return addCalendarDaysIST(mondayYmd, -7 * (n - 1));
}
