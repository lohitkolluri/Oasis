/**
 * Traffic-based trigger detection: gridlock / road closure.
 * Uses TomTom Traffic Flow API (Flow Segment Data) for real-time congestion.
 */

import { EXTERNAL_APIS, TRIGGERS } from '@/lib/config/constants';
import type { TriggerCandidate } from '@/lib/adjudicator/types';
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
 * Check traffic triggers for a zone using TomTom Flow Segment Data.
 * Returns a candidate if the segment shows severe congestion (currentSpeed << freeFlowSpeed)
 * or road closure.
 */
export async function checkTrafficTriggers(
  zone: { lat: number; lng: number },
  tomtomKey: string | undefined,
): Promise<TriggerCandidate[]> {
  const { lat, lng } = zone;
  const candidates: TriggerCandidate[] = [];

  if (!tomtomKey?.trim()) return candidates;

  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${encodeURIComponent(tomtomKey)}&point=${lat},${lng}&unit=kmph`;
    const data = await fetchWithRetry<TomTomFlowSegmentData>(url, undefined, {
      cacheTtlMs: EXTERNAL_APIS.CACHE_TRAFFIC_TTL_MS,
    });

    const segment = data.flowSegmentData;
    if (!segment) return candidates;

    const currentSpeed = Number(segment.currentSpeed ?? 0);
    const freeFlowSpeed = Number(segment.freeFlowSpeed ?? 0);
    const roadClosure = segment.roadClosure === true;
    const confidence = Number(segment.confidence ?? 0);

    if (roadClosure) {
      candidates.push({
        type: 'traffic',
        subtype: 'traffic_gridlock',
        severity: 10,
        geofence: {
          type: 'circle',
          lat,
          lng,
          radius_km: TRIGGERS.DEFAULT_GEOFENCE_RADIUS_KM,
        },
        raw: {
          trigger: 'traffic_gridlock',
          source: 'tomtom_traffic',
          roadClosure: true,
          currentSpeed,
          freeFlowSpeed,
          confidence,
        },
      });
      return candidates;
    }

    if (freeFlowSpeed <= 0 || confidence < TRIGGERS.TRAFFIC_MIN_CONFIDENCE) return candidates;

    const ratio = currentSpeed / freeFlowSpeed;
    if (ratio < TRIGGERS.TRAFFIC_CONGESTION_RATIO_THRESHOLD) {
      const severity = ratio <= 0.2 ? 9 : ratio <= 0.4 ? 8 : 7;
      candidates.push({
        type: 'traffic',
        subtype: 'traffic_gridlock',
        severity,
        geofence: {
          type: 'circle',
          lat,
          lng,
          radius_km: TRIGGERS.DEFAULT_GEOFENCE_RADIUS_KM,
        },
        raw: {
          trigger: 'traffic_gridlock',
          source: 'tomtom_traffic',
          currentSpeed,
          freeFlowSpeed,
          ratio,
          confidence,
        },
      });
    }
  } catch {
    /* skip zone on API error */
  }

  return candidates;
}
