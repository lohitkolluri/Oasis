/**
 * Traffic-based trigger detection: gridlock / road closure.
 * Uses TomTom Traffic Flow API (Flow Segment Data) for real-time congestion.
 */

import { mergeSourceHealth } from '@/lib/adjudicator/ledger';
import { triggersFromContext } from '@/lib/adjudicator/rule-context';
import type { AdjudicatorInstrumentationContext, TriggerCandidate } from '@/lib/adjudicator/types';
import { EXTERNAL_APIS } from '@/lib/config/constants';
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

export type TomTomTrafficVerification = {
  ok: boolean;
  confirmed: boolean;
  /** When confirmed, a 7–10 severity score aligned with trigger semantics. */
  severity: number | null;
  reason: 'confirmed' | 'not_congested' | 'no_valid_segments' | 'missing_key' | 'fetch_error';
  evidence: {
    sample_points: number;
    valid_points: number;
    congested_points: number;
    has_road_closure: boolean;
    avg_ratio: number | null;
    point_details: PointResult[];
  };
};

async function fetchPointTraffic(
  lat: number,
  lng: number,
  tomtomKey: string,
): Promise<PointResult | null> {
  const T = triggersFromContext();
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&unit=kmph`;
    const data = await fetchWithRetry<TomTomFlowSegmentData>(
      url,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${tomtomKey}`,
        },
      },
      {
        cacheTtlMs: EXTERNAL_APIS.CACHE_TRAFFIC_TTL_MS,
      },
    );
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
 * Deterministic verification helper for "traffic_gridlock" candidates.
 * Produces a stable yes/no + evidence snapshot suitable for audit and UI.
 */
export async function verifyTrafficGridlockWithTomTom(
  zone: { lat: number; lng: number },
  tomtomKey: string | undefined,
  ctx?: AdjudicatorInstrumentationContext,
): Promise<TomTomTrafficVerification> {
  const T = triggersFromContext();
  const { lat, lng } = zone;

  if (!tomtomKey?.trim()) {
    return {
      ok: false,
      confirmed: false,
      severity: null,
      reason: 'missing_key',
      evidence: {
        sample_points: 0,
        valid_points: 0,
        congested_points: 0,
        has_road_closure: false,
        avg_ratio: null,
        point_details: [],
      },
    };
  }

  const t0 = Date.now();
  const samplePoints = generateSamplePoints(lat, lng, T.DEFAULT_GEOFENCE_RADIUS_KM);
  let results: Array<PointResult | null> = [];
  try {
    results = await Promise.all(
      samplePoints.map((p) => fetchPointTraffic(p.lat, p.lng, tomtomKey)),
    );
  } catch {
    return {
      ok: false,
      confirmed: false,
      severity: null,
      reason: 'fetch_error',
      evidence: {
        sample_points: samplePoints.length,
        valid_points: 0,
        congested_points: 0,
        has_road_closure: false,
        avg_ratio: null,
        point_details: [],
      },
    };
  }

  if (ctx) {
    const observedAt = new Date().toISOString();
    await mergeSourceHealth(ctx.supabase, 'tomtom_traffic', {
      ok: true,
      latencyMs: Date.now() - t0,
      observedAt,
    });
  }

  const validResults = results.filter((r): r is PointResult => r !== null);
  const congestedCount = validResults.filter((r) => r.congested).length;
  const hasRoadClosure = validResults.some((r) => r.roadClosure);
  const avgRatio =
    validResults.length > 0
      ? validResults.reduce((sum, r) => sum + r.ratio, 0) / validResults.length
      : null;

  if (validResults.length === 0) {
    return {
      ok: false,
      confirmed: false,
      severity: null,
      reason: 'no_valid_segments',
      evidence: {
        sample_points: samplePoints.length,
        valid_points: 0,
        congested_points: 0,
        has_road_closure: false,
        avg_ratio: null,
        point_details: [],
      },
    };
  }

  const confirmed = hasRoadClosure || congestedCount >= Math.ceil(validResults.length / 2);
  const severity = confirmed
    ? hasRoadClosure
      ? 10
      : avgRatio != null && avgRatio <= 0.2
        ? 9
        : avgRatio != null && avgRatio <= 0.4
          ? 8
          : 7
    : null;

  return {
    ok: true,
    confirmed,
    severity,
    reason: confirmed ? 'confirmed' : 'not_congested',
    evidence: {
      sample_points: samplePoints.length,
      valid_points: validResults.length,
      congested_points: congestedCount,
      has_road_closure: hasRoadClosure,
      avg_ratio: avgRatio != null ? Number(avgRatio.toFixed(3)) : null,
      point_details: validResults,
    },
  };
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

  const verification = await verifyTrafficGridlockWithTomTom(zone, tomtomKey, ctx);
  if (!verification.confirmed || verification.severity == null) return candidates;

  candidates.push({
    type: 'traffic',
    subtype: 'traffic_gridlock',
    severity: verification.severity,
    geofence: {
      type: 'circle',
      lat,
      lng,
      radius_km: T.DEFAULT_GEOFENCE_RADIUS_KM,
    },
    raw: {
      trigger: 'traffic_gridlock',
      source: 'tomtom_traffic',
      ...verification.evidence,
    },
  });

  return candidates;
}
