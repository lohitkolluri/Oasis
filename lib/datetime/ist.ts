/**
 * India Standard Time (UTC+05:30, no DST).
 * Policy weeks are Monday 00:00 – Sunday 23:59 IST; DATE columns are interpreted on this calendar.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const istYmdPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const istWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIMEZONE,
  weekday: 'short',
});

const WEEKDAY_SUN0: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** YYYY-MM-DD for the IST calendar day that contains `instant`. */
export function getISTDateString(instant: Date = new Date()): string {
  const parts = istYmdPartsFormatter.formatToParts(instant);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) throw new Error('getISTDateString: could not format date parts');
  return `${y}-${m}-${d}`;
}

/** 0 = Sunday … 6 = Saturday in IST. */
export function getISTWeekdaySun0(instant: Date = new Date()): number {
  const w = istWeekdayFormatter.format(instant);
  const v = WEEKDAY_SUN0[w];
  if (v === undefined) throw new Error(`Unknown IST weekday label: ${w}`);
  return v;
}

/** 0 = Monday … 6 = Sunday in IST (chart buckets Mon-first). */
export function getISTWeekdayMon0(instant: Date): number {
  return (getISTWeekdaySun0(instant) + 6) % 7;
}

/** IST midnight at the start of YYYY-MM-DD. */
export function istStartOfDay(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+05:30`);
}

/** Last millisecond of YYYY-MM-DD in IST (23:59:59.999). */
export function istEndOfDay(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999+05:30`);
}

/** Add signed calendar days on the IST civil calendar. */
export function addCalendarDaysIST(ymd: string, deltaDays: number): string {
  const t = istStartOfDay(ymd).getTime() + deltaDays * MS_PER_DAY;
  return getISTDateString(new Date(t));
}

/** Monday 00:00 IST of the week that contains `instant`. */
export function getISTCurrentCoverageWeekMondayStart(instant: Date = new Date()): Date {
  const todayYmd = getISTDateString(instant);
  const dow = getISTWeekdaySun0(instant);
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const mondayYmd = addCalendarDaysIST(todayYmd, -daysFromMonday);
  return istStartOfDay(mondayYmd);
}

/** Monday YYYY-MM-DD of the IST week containing `instant` (for grouping payouts, etc.). */
export function getISTMondayYmdForInstant(instant: Date): string {
  return getISTDateString(getISTCurrentCoverageWeekMondayStart(instant));
}

/** Short label for a policy DATE (YYYY-MM-DD) in IST. */
export function formatShortDateIST(ymd: string, locale = 'en-IN'): string {
  return new Date(`${ymd}T12:00:00+05:30`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: IST_TIMEZONE,
  });
}
