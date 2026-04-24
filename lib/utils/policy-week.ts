/**
 * Back-compat wrapper around the unified Oasis time layer.
 *
 * Prefer importing from `@/lib/datetime/oasis-time` directly.
 */

import { getISTDateString, istStartOfDay } from '@/lib/datetime/ist';
import { coverageWeekRange, enrollmentWeekRange } from '@/lib/datetime/oasis-time';

export function getCoverageWeekRange(referenceDate: Date = new Date()): {
  start: string;
  end: string;
} {
  return coverageWeekRange(referenceDate);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getRemainingCoverageDaysInWeek(weekEnd: string, now: Date = new Date()): number {
  const todayIst = getISTDateString(now);
  const end = istStartOfDay(weekEnd);
  const today = istStartOfDay(todayIst);
  if (today > end) return 0;
  return Math.floor((end.getTime() - today.getTime()) / MS_PER_DAY) + 1;
}

export function prorateWeeklyPremium(weeklyPremiumInr: number, coveredDays: number): number {
  if (!Number.isFinite(weeklyPremiumInr) || weeklyPremiumInr <= 0) return 0;
  const safeDays = Math.max(0, Math.min(7, Math.floor(coveredDays)));
  if (safeDays === 0) return 0;
  if (safeDays === 7) return Math.round(weeklyPremiumInr);
  return Math.max(1, Math.round((weeklyPremiumInr * safeDays) / 7));
}

function getEnrollmentWeekRange(referenceDate: Date = new Date()): {
  start: string;
  end: string;
} {
  return enrollmentWeekRange(referenceDate);
}

/** Backwards compatible alias (kept for admin/pricing callers). */
export function getPolicyWeekRange(referenceDate: Date = new Date()): {
  start: string;
  end: string;
} {
  return enrollmentWeekRange(referenceDate);
}
