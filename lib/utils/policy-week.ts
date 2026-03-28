/**
 * Canonical coverage week for weekly policies and premium_recommendations.
 * Matches dashboard policy page: if today is Monday, the active enrollment week is the *next* Monday (not the same day).
 */
export function getPolicyWeekRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  const start = d.toISOString().split('T')[0];
  const endDate = new Date(d);
  endDate.setDate(d.getDate() + 6);
  const end = endDate.toISOString().split('T')[0];
  return { start, end };
}
