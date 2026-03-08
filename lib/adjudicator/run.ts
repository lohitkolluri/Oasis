/**
 * Parametric adjudicator orchestrator.
 * Collects trigger candidates (weather + news), persists events, runs claims and payouts.
 * Invoked by cron or POST /api/webhooks/disruption.
 */

import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { ADJUDICATOR, DEFAULT_ZONE, TRIGGERS } from '@/lib/config/constants';
import { isWithinCircle } from '@/lib/utils/geo';
import { getActiveZones } from '@/lib/adjudicator/zones';
import { checkWeatherTriggers } from '@/lib/adjudicator/triggers/weather';
import { checkNewsTriggers } from '@/lib/adjudicator/triggers/news';
import { checkTrafficTriggers } from '@/lib/adjudicator/triggers/traffic';
import { isDuplicateEvent, insertDisruptionEvent } from '@/lib/adjudicator/events';
import { processClaimsForEvent } from '@/lib/adjudicator/claims';
import { logRun } from '@/lib/adjudicator/payouts';
import type {
  AdjudicatorResult,
  DemoTriggerOptions,
  TriggerCandidate,
  ProcessTriggerResult,
} from '@/lib/adjudicator/types';

export type { AdjudicatorResult, DemoTriggerOptions, TriggerCandidate, ProcessTriggerResult };

const BATCH_SIZE = 5;

/** Process one trigger: duplicate check, insert event, then match policies and create claims/payouts. */
export async function processSingleTrigger(
  supabase: ReturnType<typeof createAdminClient>,
  candidate: TriggerCandidate,
  options: { skipIdempotency?: boolean; restrictToProfileId?: string } = {},
): Promise<ProcessTriggerResult> {
  const { skipIdempotency = false, restrictToProfileId } = options;

  if (!skipIdempotency && (await isDuplicateEvent(supabase, candidate))) {
    return { claimsCreated: 0, payoutsInitiated: 0 };
  }

  const event = await insertDisruptionEvent(supabase, candidate);
  if (!event) return { claimsCreated: 0, payoutsInitiated: 0 };

  return processClaimsForEvent(supabase, event.id, candidate, {
    ...(restrictToProfileId && { restrictToProfileId }),
  });
}

export async function runAdjudicator(
  demoTrigger?: DemoTriggerOptions,
): Promise<AdjudicatorResult> {
  const runId = randomUUID();
  const startMs = Date.now();
  const supabase = createAdminClient();
  logger.info('adjudicator run started', { runId, is_demo: !!demoTrigger });
  const tomorrowKey = process.env.TOMORROW_IO_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const newsDataKey = process.env.NEWSDATA_IO_API_KEY;
  const waqiKey = process.env.WAQI_API_KEY;
  const tomtomKey = process.env.TOMTOM_API_KEY;

  let allCandidates: TriggerCandidate[] = [];
  let zonesChecked = 0;

  if (demoTrigger) {
    const typeMap: Record<string, 'weather' | 'traffic' | 'social'> = {
      extreme_heat: 'weather',
      heavy_rain: 'weather',
      severe_aqi: 'weather',
      traffic_gridlock: 'traffic',
      zone_curfew: 'social',
    };
    allCandidates = [
      {
        type: typeMap[demoTrigger.eventSubtype] ?? 'weather',
        subtype: demoTrigger.eventSubtype,
        severity: demoTrigger.severity ?? 8,
        geofence: {
          lat: demoTrigger.lat,
          lng: demoTrigger.lng,
          radius_km:
            demoTrigger.radiusKm ?? TRIGGERS.DEFAULT_GEOFENCE_RADIUS_KM,
        },
        raw: {
          trigger: demoTrigger.eventSubtype,
          demo: true,
          source: 'admin_demo_mode',
        },
      },
    ];
    zonesChecked = 1;
  } else {
    const zones = await getActiveZones(supabase);
    zonesChecked = zones.length;

    for (let i = 0; i < zones.length; i += BATCH_SIZE) {
      const batch = zones.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (z) => {
          const [weatherCandidates, trafficCandidates] = await Promise.all([
            checkWeatherTriggers(z, tomorrowKey, waqiKey),
            checkTrafficTriggers(z, tomtomKey),
          ]);
          return [...weatherCandidates, ...trafficCandidates];
        }),
      );
      const radiusKm = TRIGGERS.CANDIDATE_DEDUPE_RADIUS_KM;
      for (const zoneCandidates of results) {
        for (const c of zoneCandidates) {
          const geofenceLat = c.geofence?.lat;
          const geofenceLng = c.geofence?.lng;
          const isDuplicate = allCandidates.some((existing) => {
            const existingLat = existing.geofence?.lat;
            const existingLng = existing.geofence?.lng;
            return (
              existing.subtype === c.subtype &&
              existingLat != null &&
              existingLng != null &&
              geofenceLat != null &&
              geofenceLng != null &&
              isWithinCircle(
                existingLat,
                existingLng,
                geofenceLat,
                geofenceLng,
                radiusKm,
              )
            );
          });
          if (!isDuplicate) allCandidates.push(c);
        }
      }
    }

    if (newsDataKey && openRouterKey) {
      const newsCandidates = await checkNewsTriggers(
        openRouterKey,
        newsDataKey,
      );
      allCandidates.push(...newsCandidates);
    }
  }

  let claimsCreated = 0;
  let payoutsInitiated = 0;
  let payoutFailures = 0;

  const concurrency = ADJUDICATOR.TRIGGER_CONCURRENCY;
  const triggerOptions = {
    skipIdempotency: !!demoTrigger,
    restrictToProfileId: demoTrigger?.riderId,
  };
  for (let i = 0; i < allCandidates.length; i += concurrency) {
    const batch = allCandidates.slice(i, i + concurrency);
    const outcomes = await Promise.all(
      batch.map((candidate) =>
        processSingleTrigger(supabase, candidate, triggerOptions),
      ),
    );
    for (const outcome of outcomes) {
      claimsCreated += outcome.claimsCreated;
      payoutsInitiated += outcome.payoutsInitiated;
      payoutFailures += outcome.payoutFailures ?? 0;
    }
  }

  const durationMs = Date.now() - startMs;
  const result: AdjudicatorResult = {
    message: demoTrigger
      ? 'Demo adjudicator run complete'
      : 'Adjudicator run complete',
    candidates_found: allCandidates.length,
    claims_created: claimsCreated,
    zones_checked: zonesChecked,
    payouts_initiated: payoutsInitiated,
    payout_failures: payoutFailures > 0 ? payoutFailures : undefined,
  };

  const logged = await logRun(supabase, {
    ...result,
    duration_ms: durationMs,
    is_demo: !!demoTrigger,
    run_id: runId,
  });
  if (!logged) result.log_failures = 1;

  logger.info('adjudicator run finished', {
    runId,
    duration_ms: durationMs,
    candidates_found: result.candidates_found,
    claims_created: result.claims_created,
    payouts_initiated: result.payouts_initiated,
    error: result.error,
  });
  return { ...result, run_id: runId };
}
