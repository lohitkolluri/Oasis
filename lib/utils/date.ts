/** ISO date string (YYYY-MM-DD) for the given date. */
export function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Add n days to a date and return YYYY-MM-DD. */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}
