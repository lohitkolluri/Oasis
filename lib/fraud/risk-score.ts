/**
 * Composite fraud risk (0–100) from extended checks — auditable weights in `FRAUD.RISK_WEIGHT_*`.
 */

import { FRAUD } from '@/lib/config/constants';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Minimal shape from `lib/fraud/detector` (avoid circular imports). */
export type FraudSignal = {
  isFlagged: boolean;
  checkName?: string;
  reason?: string;
  facts?: Record<string, unknown>;
};

export type FraudRiskTier = 'low' | 'elevated' | 'high';

export type AggregatedFraudRisk = {
  score: number;
  tier: FraudRiskTier;
  breakdown: Record<string, unknown>;
};

const EXTENDED_WEIGHTS: Record<string, number> = {
  cluster_anomaly: FRAUD.RISK_WEIGHT_CLUSTER,
  historical_baseline: FRAUD.RISK_WEIGHT_BASELINE,
  device_fingerprint: FRAUD.RISK_WEIGHT_DEVICE_FP,
  cross_profile_velocity: FRAUD.RISK_WEIGHT_CROSS_PROFILE,
};

/** Normalized cluster threshold from zone rolling average (legacy fixed min when unknown). */
export function computeClusterBurstThreshold(rollingAvgClaims: number | null): number {
  if (rollingAvgClaims == null || !Number.isFinite(rollingAvgClaims) || rollingAvgClaims <= 0) {
    return FRAUD.CLUSTER_ANOMALY_MIN_CLAIMS;
  }
  const raw = Math.ceil(rollingAvgClaims * FRAUD.CLUSTER_ROLLING_FRACTION);
  return Math.min(FRAUD.CLUSTER_DYNAMIC_MAX, Math.max(FRAUD.CLUSTER_DYNAMIC_MIN, raw));
}

export function fraudRiskTierFromScore(score: number): FraudRiskTier {
  if (score <= FRAUD.RISK_TIER_LOW_MAX) return 'low';
  if (score <= FRAUD.RISK_TIER_ELEVATED_MAX) return 'elevated';
  return 'high';
}

export function aggregateExtendedFraudRisk(checks: FraudSignal[]): AggregatedFraudRisk {
  let score = 0;
  const breakdown: Record<string, unknown> = {};

  for (const c of checks) {
    const name = c.checkName;
    if (!name) continue;
    const w = EXTENDED_WEIGHTS[name];
    if (c.isFlagged && w != null) {
      score += w;
      breakdown[name] = {
        flagged: true,
        reason: c.reason ?? null,
        facts: c.facts ?? null,
      };
    } else {
      breakdown[name] = {
        flagged: false,
        facts: c.facts ?? null,
      };
    }
  }

  score = Math.min(100, score);
  return {
    score,
    tier: fraudRiskTierFromScore(score),
    breakdown,
  };
}

export async function persistClaimFraudRisk(
  supabase: SupabaseClient,
  claimId: string,
  aggregated: AggregatedFraudRisk,
): Promise<void> {
  await supabase
    .from('parametric_claims')
    .update({
      fraud_risk_score: aggregated.score,
      fraud_risk_tier: aggregated.tier,
      fraud_risk_breakdown: aggregated.breakdown as Record<string, unknown>,
    })
    .eq('id', claimId);
}

/**
 * After verification when payout destination is only a soft duplicate (two profiles, low velocity),
 * bump score so ops still see elevated risk without blocking payout.
 */
export async function mergePayoutSoftRiskIntoClaim(
  supabase: SupabaseClient,
  claimId: string,
  facts: Record<string, unknown>,
): Promise<void> {
  const { data: row, error } = await supabase
    .from('parametric_claims')
    .select('fraud_risk_score, fraud_risk_breakdown')
    .eq('id', claimId)
    .single();

  if (error || !row) return;

  const prev = Number(row.fraud_risk_score ?? 0);
  const breakdown = (row.fraud_risk_breakdown as Record<string, unknown> | null) ?? {};
  const nextScore = Math.min(100, prev + FRAUD.RISK_WEIGHT_PAYOUT_SOFT);
  const tier = fraudRiskTierFromScore(nextScore);

  await supabase
    .from('parametric_claims')
    .update({
      fraud_risk_score: nextScore,
      fraud_risk_tier: tier,
      fraud_risk_breakdown: {
        ...breakdown,
        payout_destination_soft: facts,
      },
    })
    .eq('id', claimId);
}
