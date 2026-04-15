/**
 * Rough bounding-box labels for rider zone coords (profiles.zone_latitude/longitude).
 * Used for admin UI; not authoritative geography.
 */
const METRO_BOXES: Array<{
  label: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}> = [
  { label: 'Delhi NCR', minLat: 28.35, maxLat: 28.92, minLng: 76.85, maxLng: 77.55 },
  { label: 'Mumbai', minLat: 18.85, maxLat: 19.45, minLng: 72.75, maxLng: 73.05 },
  { label: 'Bengaluru', minLat: 12.75, maxLat: 13.2, minLng: 77.35, maxLng: 77.85 },
  { label: 'Hyderabad', minLat: 17.25, maxLat: 17.6, minLng: 78.25, maxLng: 78.65 },
  { label: 'Chennai', minLat: 12.85, maxLat: 13.35, minLng: 80.1, maxLng: 80.35 },
  { label: 'Kolkata', minLat: 22.4, maxLat: 22.65, minLng: 88.2, maxLng: 88.5 },
  { label: 'Pune', minLat: 18.4, maxLat: 18.65, minLng: 73.7, maxLng: 73.95 },
  { label: 'Ahmedabad', minLat: 22.95, maxLat: 23.2, minLng: 72.45, maxLng: 72.75 },
];

/**
 * Returns a short city/region label for Indian metros, or a compact coord fallback.
 */
export function inferIndianMetroLabel(lat: number, lng: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Unknown';
  for (const b of METRO_BOXES) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
      return b.label;
    }
  }
  return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
}
