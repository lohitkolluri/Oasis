/** ISO date string (YYYY-MM-DD) for the given date. */
export function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}
