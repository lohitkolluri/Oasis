import { addCalendarDaysIST, getISTDateString } from '@/lib/datetime/ist';

/**
 * YYYY-MM-DD for the IST calendar day containing `d`.
 * Use for comparing `weekly_policies.week_*` DATE fields and policy logic.
 */
export function toDateString(d: Date = new Date()): string {
  return getISTDateString(d);
}

/** Add n calendar days on the IST civil calendar; `dateStr` is YYYY-MM-DD. */
export function addDays(dateStr: string, n: number): string {
  return addCalendarDaysIST(dateStr, n);
}
