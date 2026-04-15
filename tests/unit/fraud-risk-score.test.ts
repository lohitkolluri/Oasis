import { FRAUD } from '@/lib/config/constants';
import {
  aggregateExtendedFraudRisk,
  computeClusterBurstThreshold,
  fraudRiskTierFromScore,
} from '@/lib/fraud/risk-score';
import { describe, expect, it } from 'vitest';

describe('computeClusterBurstThreshold', () => {
  it('uses legacy floor when rolling unknown', () => {
    expect(computeClusterBurstThreshold(null)).toBe(FRAUD.CLUSTER_ANOMALY_MIN_CLAIMS);
    expect(computeClusterBurstThreshold(0)).toBe(FRAUD.CLUSTER_ANOMALY_MIN_CLAIMS);
  });

  it('scales with rolling average and clamps', () => {
    expect(computeClusterBurstThreshold(400)).toBe(
      Math.min(
        FRAUD.CLUSTER_DYNAMIC_MAX,
        Math.max(FRAUD.CLUSTER_DYNAMIC_MIN, Math.ceil(400 * FRAUD.CLUSTER_ROLLING_FRACTION)),
      ),
    );
  });
});

describe('fraudRiskTierFromScore', () => {
  it('maps tiers', () => {
    expect(fraudRiskTierFromScore(10)).toBe('low');
    expect(fraudRiskTierFromScore(50)).toBe('elevated');
    expect(fraudRiskTierFromScore(90)).toBe('high');
  });
});

describe('aggregateExtendedFraudRisk', () => {
  it('sums weights for flagged extended checks', () => {
    const agg = aggregateExtendedFraudRisk([
      { isFlagged: true, checkName: 'cluster_anomaly', reason: 'x' },
      { isFlagged: true, checkName: 'historical_baseline', reason: 'y' },
    ]);
    expect(agg.score).toBe(FRAUD.RISK_WEIGHT_CLUSTER + FRAUD.RISK_WEIGHT_BASELINE);
    expect(agg.tier).toBe('elevated');
    expect(agg.breakdown.cluster_anomaly).toMatchObject({ flagged: true });
  });

  it('caps at 100', () => {
    const agg = aggregateExtendedFraudRisk([
      { isFlagged: true, checkName: 'cluster_anomaly' },
      { isFlagged: true, checkName: 'historical_baseline' },
      { isFlagged: true, checkName: 'device_fingerprint' },
      { isFlagged: true, checkName: 'cross_profile_velocity' },
    ]);
    expect(agg.score).toBe(100);
  });
});
