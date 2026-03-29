import { getISTDateString, istEndOfDay, istStartOfDay } from '@/lib/datetime/ist';

/** @deprecated Use istStartOfDay — kept for call sites that mean "policy DATE → instant". */
export const parseLocalDate = istStartOfDay;

export function coverageEndOfDay(weekEnd: string): Date {
  return istEndOfDay(weekEnd);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Calendar days from start of today IST through `weekEnd` still inside the policy week (1–7).
 * Not wall-clock time until coverage ends — use {@link getCoverageTimeRemainingParts} for UI countdowns.
 */
export function getDaysRemainingInCoverageWeek(weekStart: string, weekEnd: string, now: Date = new Date()): number {
  const start = istStartOfDay(weekStart);
  const end = coverageEndOfDay(weekEnd);
  if (now > end) return 0;
  const totalDays =
    Math.round((istStartOfDay(weekEnd).getTime() - istStartOfDay(weekStart).getTime()) / MS_PER_DAY) + 1;
  const todayIst = getISTDateString(now);
  const todayStart = istStartOfDay(todayIst);
  const elapsed = Math.floor((todayStart.getTime() - start.getTime()) / MS_PER_DAY);
  const remaining = totalDays - elapsed;
  return Math.max(0, Math.min(remaining, totalDays));
}

/**
 * Whole days + hours from `now` until coverage ends (end of `weekEnd` IST).
 * Matches policy wording (Sunday 23:59 IST).
 */
export function getCoverageTimeRemainingParts(
  weekEnd: string,
  now: Date = new Date(),
): { days: number; hours: number } {
  const end = coverageEndOfDay(weekEnd);
  const diffMs = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(diffMs / MS_PER_DAY);
  const hours = Math.floor((diffMs % MS_PER_DAY) / MS_PER_HOUR);
  return { days, hours };
}

/** Progress 0–100 through the coverage window (0% before week start IST). */
export function getCoverageWeekProgressPercent(weekStart: string, weekEnd: string, now: Date = new Date()): number {
  const start = istStartOfDay(weekStart);
  const end = coverageEndOfDay(weekEnd);
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}
