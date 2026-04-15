import { parsePayoutLadder, payoutForSeverity } from '@/lib/parametric-rules/payout-ladder';
import { describe, expect, it } from 'vitest';

describe('payoutForSeverity', () => {
  const defaultLadder = parsePayoutLadder(null);

  it('returns base amount with default ladder (multiplier 1)', () => {
    expect(payoutForSeverity(300, 5, defaultLadder)).toBe(300);
  });

  it('clamps severity to 0-10', () => {
    expect(payoutForSeverity(300, -5, defaultLadder)).toBe(300);
    expect(payoutForSeverity(300, 15, defaultLadder)).toBe(300);
  });

  it('returns base if ladder is empty', () => {
    expect(payoutForSeverity(300, 5, [])).toBe(300);
  });

  it('applies tiered multipliers', () => {
    const ladder = [
      { severity_min: 0, severity_max: 4, multiplier: 0.5 },
      { severity_min: 5, severity_max: 7, multiplier: 1.0 },
      { severity_min: 8, severity_max: 10, multiplier: 1.5 },
    ];
    expect(payoutForSeverity(200, 3, ladder)).toBe(100);
    expect(payoutForSeverity(200, 6, ladder)).toBe(200);
    expect(payoutForSeverity(200, 9, ladder)).toBe(300);
  });

  it('returns 0 when multiplier is 0', () => {
    const ladder = [{ severity_min: 0, severity_max: 10, multiplier: 0 }];
    expect(payoutForSeverity(300, 5, ladder)).toBe(0);
  });
});

describe('parsePayoutLadder', () => {
  it('returns default for null input', () => {
    const result = parsePayoutLadder(null);
    expect(result).toHaveLength(1);
    expect(result[0].multiplier).toBe(1);
  });

  it('returns default for empty array', () => {
    expect(parsePayoutLadder([])).toHaveLength(1);
  });

  it('filters out invalid steps', () => {
    const raw = [
      { severity_min: 0, severity_max: 5, multiplier: 1 },
      { bad: true },
      { severity_min: 6, severity_max: 10, multiplier: 1.5 },
    ];
    const result = parsePayoutLadder(raw);
    expect(result).toHaveLength(2);
  });

  it('returns default when all steps are invalid', () => {
    const result = parsePayoutLadder([{ invalid: true }]);
    expect(result).toHaveLength(1);
    expect(result[0].multiplier).toBe(1);
  });
});
