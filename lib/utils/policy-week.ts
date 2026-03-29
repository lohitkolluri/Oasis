/**
 * Canonical coverage week for weekly policies and premium_recommendations.
 * All boundaries use IST (Asia/Kolkata), matching policy wording.
 *
 * Enrollment / pricing week = the Monday-starting week *after* the IST week that contains
 * `referenceDate`. Equivalently: Monday of the coverage week containing the instant, plus 7 days.
 * (On IST Monday you are inside the current coverage week; premiums target the following Monday.)
 *
 * Important for scheduling: if the weekly-premium job runs on IST *Sunday*, `getPolicyWeekRange`
 * resolves to the Monday that starts the next calendar day — one week earlier than the same
 * function on IST *Monday*. Run that cron after IST Monday 00:00 so DB keys match the admin UI.
 */

import {
  addCalendarDaysIST,
  getISTDateString,
  getISTCurrentCoverageWeekMondayStart,
} from '@/lib/datetime/ist';

export function getPolicyWeekRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const currentMondayYmd = getISTDateString(getISTCurrentCoverageWeekMondayStart(referenceDate));
  const start = addCalendarDaysIST(currentMondayYmd, 7);
  const end = addCalendarDaysIST(start, 6);
  return { start, end };
}
