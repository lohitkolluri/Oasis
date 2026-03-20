import { describe, expect, it } from 'vitest';
import { PREMIUM } from '@/lib/config/constants';
import { calculateDynamicPremium, estimateWeeklyIncome } from '@/lib/ml/premium-calc';

describe('premium-calc', () => {
  describe('estimateWeeklyIncome', () => {
    it('uses avgDailyDeliveries override when provided', () => {
      expect(estimateWeeklyIncome('zepto', 20)).toBe(5600);
    });

    it('falls back to platform-specific defaults', () => {
      expect(estimateWeeklyIncome('blinkit')).toBe(7500);
      expect(estimateWeeklyIncome('swiggy')).toBe(6500);
      expect(estimateWeeklyIncome('porter')).toBe(5500);
      expect(estimateWeeklyIncome('unknown-platform')).toBe(6000);
    });
  });

  describe('calculateDynamicPremium', () => {
    const baseInput = {
      zoneRiskFactors: { heatEvents: 2, rainEvents: 1, trafficEvents: 1, socialEvents: 0 },
      forecastRisk: 0.4,
      platform: 'zepto',
      socialStrikeFrequency: 0.1,
      riderClaimFrequency: 0.2,
    };

    it('always clamps final premium within configured bounds', () => {
      const result = calculateDynamicPremium(baseInput);
      expect(result.final_premium).toBeGreaterThanOrEqual(PREMIUM.BASE);
      expect(result.final_premium).toBeLessThanOrEqual(PREMIUM.MAX);
    });

    it('applies strict 20% smoothing when zone is unchanged', () => {
      const result = calculateDynamicPremium({
        ...baseInput,
        previousPremium: 100,
        zoneChanged: false,
        zoneRiskFactors: { heatEvents: 12, rainEvents: 10, trafficEvents: 8, socialEvents: 8 },
        forecastRisk: 1,
        socialStrikeFrequency: 1,
        riderClaimFrequency: 1,
      });

      expect(result.final_premium).toBeLessThanOrEqual(120);
      expect(result.final_premium).toBeGreaterThanOrEqual(80);
    });

    it('allows wider 50% smoothing when zone changed', () => {
      const result = calculateDynamicPremium({
        ...baseInput,
        previousPremium: 100,
        zoneChanged: true,
        zoneRiskFactors: { heatEvents: 12, rainEvents: 10, trafficEvents: 8, socialEvents: 8 },
        forecastRisk: 1,
        socialStrikeFrequency: 1,
        riderClaimFrequency: 1,
      });

      expect(result.final_premium).toBeLessThanOrEqual(150);
      expect(result.final_premium).toBeGreaterThanOrEqual(50);
    });
  });
});
