/**
 * Shared geospatial utilities used across the adjudicator, fraud detector,
 * premium calculator, and API routes.
 *
 * Uses @turf/turf for accurate geodesic calculations and polygon operations.
 * All public API is identical to the previous Haversine implementation so
 * existing call-sites require zero changes.
 */
import * as turf from '@turf/turf';

// ── Distance & circle geofencing ─────────────────────────────────────────────

/**
 * Returns true if (pointLat, pointLng) is within `radiusKm` of the circle
 * centre. Uses Turf's geodesic distance (more accurate than Haversine for
 * large distances, identical for the short ranges used here).
 */
export function isWithinCircle(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): boolean {
  return distanceKm(pointLat, pointLng, centerLat, centerLng) <= radiusKm;
}

/** Returns the geodesic distance in km between two coordinate pairs (Turf). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units: 'kilometers' });
}

// ── Polygon geofencing ────────────────────────────────────────────────────────

/**
 * Returns true if the given point falls inside or on the boundary of a
 * GeoJSON polygon (MultiPolygon or Polygon).
 * Used when a disruption event carries a precise boundary instead of a
 * circular geofence.
 */
export function isWithinPolygon(
  pointLat: number,
  pointLng: number,
  polygonGeoJson: turf.AllGeoJSON,
): boolean {
  try {
    const pt = turf.point([pointLng, pointLat]);
    if (
      polygonGeoJson &&
      typeof polygonGeoJson === 'object' &&
      'type' in polygonGeoJson &&
      (polygonGeoJson.type === 'Polygon' || polygonGeoJson.type === 'MultiPolygon')
    ) {
      return turf.booleanPointInPolygon(pt, polygonGeoJson as turf.Polygon | turf.MultiPolygon);
    }
    if (
      polygonGeoJson &&
      typeof polygonGeoJson === 'object' &&
      'type' in polygonGeoJson &&
      polygonGeoJson.type === 'Feature'
    ) {
      return turf.booleanPointInPolygon(pt, polygonGeoJson as turf.Feature<turf.Polygon | turf.MultiPolygon>);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Builds a circular GeoJSON polygon approximation from a lat/lng centre and
 * radius. Useful for rendering zone boundaries on MapLibre maps.
 * Returns a Turf Feature<Polygon> (GeoJSON-compatible).
 */
export function buildCirclePolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  steps = 64,
): turf.Feature<turf.Polygon> {
  return turf.circle([centerLng, centerLat], radiusKm, { steps, units: 'kilometers' });
}

/**
 * Returns the [west, south, east, north] bounding box of a circle.
 * Useful for fitting a MapLibre viewport to a zone.
 */
export function zoneBbox(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): [number, number, number, number] {
  const circle = buildCirclePolygon(centerLat, centerLng, radiusKm);
  return turf.bbox(circle) as [number, number, number, number];
}

// ── Nominatim reverse geocoding ───────────────────────────────────────────────

interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

interface NominatimResult {
  display_name?: string;
  address?: NominatimAddress;
}

/**
 * Reverse-geocode a coordinate to a human-readable address using Nominatim
 * (OpenStreetMap). Returns a short locality string, e.g. "Koramangala, Bengaluru".
 * Returns null on failure — callers should gracefully degrade to showing coords.
 *
 * Usage policy: 1 req/s max, no bulk geocoding.
 * https://nominatim.org/release-docs/latest/api/Reverse/
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Oasis-Insurance/1.0 (parametric-insurance-platform)',
          'Accept-Language': 'en',
        },
        next: { revalidate: 3600 }, // Cache 1h in Next.js — reverse geocoding rarely changes
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult;
    if (!data?.address) return data?.display_name?.split(',').slice(0, 2).join(',').trim() ?? null;
    const a = data.address;
    const locality =
      a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? a.county ?? null;
    const city = a.city ?? a.town ?? a.village ?? null;
    if (locality && city) return `${locality}, ${city}`;
    if (city) return city;
    return data.display_name?.split(',').slice(0, 2).join(',').trim() ?? null;
  } catch {
    return null;
  }
}

// ── Time utilities ────────────────────────────────────────────────────────────

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
