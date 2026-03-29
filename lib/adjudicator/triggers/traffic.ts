/**
 * Traffic-based trigger detection: gridlock / road closure.
 * Uses TomTom Traffic Flow API (Flow Segment Data) for real-time congestion.
 */

import { EXTERNAL_APIS } from '@/lib/config/constants';
import { mergeSourceHealth } from '@/lib/adjudicator/ledger';
import { triggersFromContext } from '@/lib/adjudicator/rule-context';
import type {
  AdjudicatorInstrumentationContext,
  TriggerCandidate,
} from '@/lib/adjudicator/types';
import { fetchWithRetry } from '@/lib/utils/retry';

/** TomTom Flow Segment Data response (segment closest to point). */
interface TomTomFlowSegmentData {
  flowSegmentData?: {
    currentSpeed?: number;
    freeFlowSpeed?: number;
    currentTravelTime?: number;
    freeFlowTravelTime?: number;
    confidence?: number;
    roadClosure?: boolean;
    coordinates?: { coordinate?: Array<{ latitude?: number; longitude?: number }> };
  };
}

/**
 * Generate sample points around a center: center + N/E/S/W at ~70% of radius.
 */
function generateSamplePoints(
  centerLat: number,
  centerLng: number,
  radiusKm?: number,
): Array<{ lat: number; lng: number }> {
  const r = radiusKm ?? triggersFromContext().DEFAULT_GEOFENCE_RADIUS_KM;
  const offsetKm = r * 0.7;
  const latOffset = offsetKm / 111.32;
  const lngOffset = offsetKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));

  return [
    { lat: centerLat, lng: centerLng },
    { lat: centerLat + latOffset, lng: centerLng },
    { lat: centerLat - latOffset, lng: centerLng },
    { lat: centerLat, lng: centerLng + lngOffset },
    { lat: centerLat, lng: centerLng - lngOffset },
  ];
}

interface PointResult {
  currentSpeed: number;
  freeFlowSpeed: number;
  roadClosure: boolean;
  confidence: number;
  ratio: number;
  congested: boolean;
}

async function fetchPointTraffic(
  lat: number,
  lng: number,
  tomtomKey: string,
): Promise<PointResult | null> {
  const T = triggersFromContext();
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${encodeURIComponent(tomtomKey)}&point=${lat},${lng}&unit=kmph`;
    const data = await fetchWithRetry<TomTomFlowSegmentData>(url, undefined, {
      cacheTtlMs: EXTERNAL_APIS.CACHE_TRAFFIC_TTL_MS,
    });
    const seg = data.flowSegmentData;
    if (!seg) return null;

    const currentSpeed = Number(seg.currentSpeed ?? 0);
    const freeFlowSpeed = Number(seg.freeFlowSpeed ?? 0);
    const roadClosure = seg.roadClosure === true;
    const confidence = Number(seg.confidence ?? 0);

    if (!roadClosure && (freeFlowSpeed <= 0 || confidence < T.TRAFFIC_MIN_CONFIDENCE)) {
      return null;
    }

    const ratio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 0;
    return {
      currentSpeed,
      freeFlowSpeed,
      roadClosure,
      confidence,
      ratio,
      congested: roadClosure || ratio < T.TRAFFIC_CONGESTION_RATIO_THRESHOLD,
    };
  } catch {
    return null;
  }
}

/**
 * Check traffic triggers for a zone using TomTom Flow Segment Data.
 * Samples 5 points (center + N/E/S/W) to get a representative picture.
 * Triggers only if majority of sampled points show congestion.
 */
export async function checkTrafficTriggers(
  zone: { lat: number; lng: number },
  tomtomKey: string | undefined,
  ctx?: AdjudicatorInstrumentationContext,
): Promise<TriggerCandidate[]> {
  const T = triggersFromContext();
  const { lat, lng } = zone;
  const candidates: TriggerCandidate[] = [];

  if (!tomtomKey?.trim()) return candidates;

  const t0 = Date.now();
  const samplePoints = generateSamplePoints(lat, lng, T.DEFAULT_GEOFENCE_RADIUS_KM);
  const results = await Promise.all(
    samplePoints.map((p) => fetchPointTraffic(p.lat, p.lng, tomtomKey)),
  );
  if (ctx) {
    const observedAt = new Date().toISOString();
    await mergeSourceHealth(ctx.supabase, 'tomtom_traffic', {
      ok: true,
      latencyMs: Date.now() - t0,
      observedAt,
    });
  }

  const validResults = results.filter((r): r is PointResult => r !== null);
  if (validResults.length === 0) return candidates;

  const congestedCount = validResults.filter((r) => r.congested).length;
  const hasRoadClosure = validResults.some((r) => r.roadClosure);

  // Require majority (>= 3/5) of sample points showing congestion, or any road closure
  if (hasRoadClosure || congestedCount >= Math.ceil(validResults.length / 2)) {
    const avgRatio =
      validResults.reduce((sum, r) => sum + r.ratio, 0) / validResults.length;
    const severity = hasRoadClosure ? 10 : avgRatio <= 0.2 ? 9 : avgRatio <= 0.4 ? 8 : 7;

    candidates.push({
      type: 'traffic',
      subtype: 'traffic_gridlock',
      severity,
      geofence: {
        type: 'circle',
        lat,
        lng,
        radius_km: T.DEFAULT_GEOFENCE_RADIUS_KM,
      },
      raw: {
        trigger: 'traffic_gridlock',
        source: 'tomtom_traffic',
        sample_points: samplePoints.length,
        congested_points: congestedCount,
        has_road_closure: hasRoadClosure,
        avg_ratio: avgRatio,
        point_details: validResults,
      },
    });
  }

  return candidates;
}
