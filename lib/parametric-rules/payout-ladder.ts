import type { PayoutLadderStep } from '@/lib/parametric-rules/types';

const DEFAULT_LADDER: PayoutLadderStep[] = [
  { severity_min: 0, severity_max: 10, multiplier: 1 },
];

function isStep(x: unknown): x is PayoutLadderStep {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.severity_min === 'number' &&
    typeof o.severity_max === 'number' &&
    typeof o.multiplier === 'number' &&
    Number.isFinite(o.severity_min) &&
    Number.isFinite(o.severity_max) &&
    Number.isFinite(o.multiplier)
  );
}

export function parsePayoutLadder(raw: unknown): PayoutLadderStep[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_LADDER;
  const steps = raw.filter(isStep);
  return steps.length > 0 ? steps : DEFAULT_LADDER;
}

export function payoutForSeverity(
  baseInr: number,
  severity: number,
  ladder: PayoutLadderStep[],
): number {
  if (ladder.length === 0) return baseInr;
  const s = Math.max(0, Math.min(10, severity));
  for (const step of ladder) {
    if (s >= step.severity_min && s <= step.severity_max) {
      const out = Math.round(baseInr * step.multiplier);
      return out > 0 ? out : 0;
    }
  }
  return baseInr;
}
