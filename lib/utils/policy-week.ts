/**
 * Canonical coverage week for weekly policies and premium_recommendations.
 * All boundaries use IST (Asia/Kolkata), matching policy wording.
 * If today is Monday IST, the active enrollment week is the *next* Monday (not the same day).
 */

import {
  addCalendarDaysIST,
  getISTDateString,
  getISTWeekdaySun0,
} from '@/lib/datetime/ist';

export function getPolicyWeekRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const todayStr = getISTDateString(referenceDate);
  const dow = getISTWeekdaySun0(referenceDate);
  const daysUntilMonday = dow === 0 ? 1 : dow === 1 ? 7 : 8 - dow;
  const start = addCalendarDaysIST(todayStr, daysUntilMonday);
  const end = addCalendarDaysIST(start, 6);
  return { start, end };
}
