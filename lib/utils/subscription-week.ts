/** Monday–Sunday coverage weeks for subscription renewals (IST calendar). */

import { getPolicyWeekRange } from '@/lib/utils/policy-week';
import { addCalendarDaysIST } from '@/lib/datetime/ist';

/** Next coverage week starting the Monday after `lastWeekEnd` (DATE string YYYY-MM-DD). */
export function nextCoverageWeekAfter(lastWeekEnd: string): { start: string; end: string } {
  const start = addCalendarDaysIST(lastWeekEnd, 1);
  const end = addCalendarDaysIST(start, 6);
  return { start, end };
}

/** Same week boundaries as dashboard policy page and payment APIs (Monday = next week if today is Monday IST). */
export function getUpcomingCoverageWeek(): { start: string; end: string } {
  return getPolicyWeekRange();
}
