/**
 * Single source of truth for all date/time/week logic in Oasis.
 *
 * Policy semantics:
 * - Coverage weeks are Monday–Sunday on the IST civil calendar (Asia/Kolkata).
 * - Enrollment/pricing weeks are the *next* Monday–Sunday window after the current coverage week.
 *
 * Data semantics:
 * - Supabase DATE columns (e.g. weekly_policies.week_start_date) are treated as IST calendar dates (YYYY-MM-DD).
 * - TIMESTAMPTZ columns (created_at) are filtered with ISO instants, but bucketing/grouping must use IST helpers.
 */

import {
  addCalendarDaysIST,
  formatShortDateIST,
  getISTCurrentCoverageWeekMondayStart,
  getISTDateString,
  istEndOfDay,
  istStartOfDay,
} from '@/lib/datetime/ist';

export type Ymd = string; // YYYY-MM-DD on IST calendar

export function formatPolicyDateShort(ymd: Ymd): string {
  return formatShortDateIST(ymd);
}

export function coverageWeekRange(referenceDate: Date = new Date()): { start: Ymd; end: Ymd } {
  const monday = getISTDateString(getISTCurrentCoverageWeekMondayStart(referenceDate));
  return { start: monday, end: addCalendarDaysIST(monday, 6) };
}

export function enrollmentWeekRange(referenceDate: Date = new Date()): { start: Ymd; end: Ymd } {
  const { start: coverageStart } = coverageWeekRange(referenceDate);
  const start = addCalendarDaysIST(coverageStart, 7);
  return { start, end: addCalendarDaysIST(start, 6) };
}

export type CoverageWindowStatus =
  | { status: 'upcoming'; days: number; hours: number }
  | { status: 'active'; days: number; hours: number }
  | { status: 'expired'; days: number; hours: number };

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

export function coverageWindowStatus(
  weekStart: Ymd,
  weekEnd: Ymd,
  now: Date = new Date(),
): CoverageWindowStatus {
  const start = istStartOfDay(weekStart);
  const end = istEndOfDay(weekEnd);

  if (now < start) {
    const diffMs = Math.max(0, start.getTime() - now.getTime());
    return {
      status: 'upcoming',
      days: Math.floor(diffMs / MS_PER_DAY),
      hours: Math.floor((diffMs % MS_PER_DAY) / MS_PER_HOUR),
    };
  }

  if (now > end) {
    return { status: 'expired', days: 0, hours: 0 };
  }

  const diffMs = Math.max(0, end.getTime() - now.getTime());
  return {
    status: 'active',
    days: Math.floor(diffMs / MS_PER_DAY),
    hours: Math.floor((diffMs % MS_PER_DAY) / MS_PER_HOUR),
  };
}

/**
 * Returns YYYY-MM-DD (IST) for policy window filters.
 * Example: `policySinceYmd(90)` for "last 90 days" policy week_start_date filtering.
 */
export function policySinceYmd(daysBack: number, now: Date = new Date()): Ymd {
  const today = getISTDateString(now);
  return addCalendarDaysIST(today, -Math.max(0, Math.floor(daysBack)));
}

