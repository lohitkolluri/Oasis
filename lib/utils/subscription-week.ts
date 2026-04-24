/** Monday–Sunday coverage weeks for subscription renewals (IST calendar). */

import { addCalendarDaysIST } from '@/lib/datetime/ist';
import { getCoverageWeekRange } from '@/lib/utils/policy-week';

/** Next coverage week starting the Monday after `lastWeekEnd` (DATE string YYYY-MM-DD). */
export function nextCoverageWeekAfter(lastWeekEnd: string): { start: string; end: string } {
  const start = addCalendarDaysIST(lastWeekEnd, 1);
  const end = addCalendarDaysIST(start, 6);
  return { start, end };
}

/**
 * Fallback week used by subscription capture when the rider has no pending row and no
 * previous policy history (first-ever mandate charge). Uses the **current** coverage week
 * so the captured payment is recorded against the active IST Mon–Sun window — not the next
 * enrollment window, which would be off by 7 days for fresh riders.
 */
export function getUpcomingCoverageWeek(): { start: string; end: string } {
  return getCoverageWeekRange();
}
