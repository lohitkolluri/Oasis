/**
 * Shared geospatial utilities.
 *
 * P2 fix: Uses specific @turf subpackages instead of importing
 * the entire @turf/turf bundle (400KB+ → ~40KB).
 */
import bbox from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import circle from '@turf/circle';
import distance from '@turf/distance';
import { point } from '@turf/helpers';
import type { Feature, GeoJSON, MultiPolygon, Polygon } from 'geojson';

// ── Distance & circle geofencing ─────────────────────────────────────────────

export function isWithinCircle(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): boolean {
  return distanceKm(pointLat, pointLng, centerLat, centerLng) <= radiusKm;
}

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const from = point([lng1, lat1]);
  const to = point([lng2, lat2]);
  return distance(from, to, { units: 'kilometers' });
}

// ── Polygon geofencing ────────────────────────────────────────────────────────

export function isWithinPolygon(
  pointLat: number,
  pointLng: number,
  polygonGeoJson: GeoJSON,
): boolean {
  try {
    const pt = point([pointLng, pointLat]);
    if (
      polygonGeoJson &&
      typeof polygonGeoJson === 'object' &&
      'type' in polygonGeoJson &&
      (polygonGeoJson.type === 'Polygon' ||
        polygonGeoJson.type === 'MultiPolygon')
    ) {
      return booleanPointInPolygon(
        pt,
        polygonGeoJson as Polygon | MultiPolygon,
      );
    }
    if (
      polygonGeoJson &&
      typeof polygonGeoJson === 'object' &&
      'type' in polygonGeoJson &&
      polygonGeoJson.type === 'Feature'
    ) {
      return booleanPointInPolygon(
        pt,
        polygonGeoJson as Feature<Polygon | MultiPolygon>,
      );
    }
    return false;
  } catch {
    return false;
  }
}

export function buildCirclePolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  steps = 64,
): Feature<Polygon> {
  return circle([centerLng, centerLat], radiusKm, {
    steps,
    units: 'kilometers',
  });
}

export function zoneBbox(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): [number, number, number, number] {
  const c = buildCirclePolygon(centerLat, centerLng, radiusKm);
  return bbox(c) as [number, number, number, number];
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

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Oasis-Insurance/1.0 (parametric-insurance-platform)',
          'Accept-Language': 'en',
        },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult;
    if (!data?.address)
      return (
        data?.display_name?.split(',').slice(0, 2).join(',').trim() ?? null
      );
    const a = data.address;
    const locality =
      a.suburb ??
      a.neighbourhood ??
      a.quarter ??
      a.city_district ??
      a.county ??
      null;
    const city = a.city ?? a.town ?? a.village ?? null;
    if (locality && city) return `${locality}, ${city}`;
    if (city) return city;
    return (
      data.display_name?.split(',').slice(0, 2).join(',').trim() ?? null
    );
  } catch {
    return null;
  }
}

// ── Time utilities ────────────────────────────────────────────────────────────

export function currentWeekMonday(): Date {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysFromMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}
