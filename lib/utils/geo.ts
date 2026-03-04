/**
 * Shared geospatial utilities used across the adjudicator, fraud detector,
 * premium calculator, and API routes.
 * Centralises the Haversine formula — previously duplicated 5+ times.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Haversine formula: returns true if (pointLat, pointLng) is within
 * `radiusKm` kilometres of (centerLat, centerLng).
 */
export function isWithinCircle(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  return distanceKm(pointLat, pointLng, centerLat, centerLng) <= radiusKm;
}

/** Returns the great-circle distance in km between two coordinate pairs. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * ISO date string (YYYY-MM-DD) for the most recent Monday on or before today.
 * Used to bucket claims into their ISO work-week.
 */
export function currentWeekMonday(): Date {
  const d = new Date();
  const dayOfWeek = d.getDay(); // 0=Sun
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysFromMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}
