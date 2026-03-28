/** Monday–Sunday coverage weeks for subscription renewals. */

import { getPolicyWeekRange } from '@/lib/utils/policy-week';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Next coverage week starting the Monday after `lastWeekEnd` (DATE string YYYY-MM-DD). */
export function nextCoverageWeekAfter(lastWeekEnd: string): { start: string; end: string } {
  const [y, m, d] = lastWeekEnd.split('-').map(Number);
  const start = new Date(y, m - 1, d + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

/** Same week boundaries as dashboard policy page and payment APIs (Monday = next week if today is Monday). */
export function getUpcomingCoverageWeek(): { start: string; end: string } {
  return getPolicyWeekRange();
}
