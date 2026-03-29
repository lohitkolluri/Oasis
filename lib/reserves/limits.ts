/**
 * Ops / liquidity dashboard limits. Not statutory reserving — illustrative caps for burn vs. limit UI.
 */

const DEFAULT_CAP_INR = 10_000_000;

/** Weekly aggregate payout cap (INR) for utilization bars. Set `RESERVE_WEEKLY_PAYOUT_CAP_INR`. */
export function getReserveWeeklyPayoutCapInr(): number {
  const raw = process.env.RESERVE_WEEKLY_PAYOUT_CAP_INR?.trim();
  if (!raw) return DEFAULT_CAP_INR;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP_INR;
}
