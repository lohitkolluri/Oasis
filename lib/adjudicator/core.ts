import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { ADJUDICATOR } from "@/lib/config/constants";
import { resolveParametricRulesAt } from "@/lib/parametric-rules/resolve";
import {
  ensureAdjudicatorRuleContext,
  getAdjudicatorRuleContext,
  runWithAdjudicatorRulesAsync,
  triggersFromContext,
} from "@/lib/adjudicator/rule-context";
import { isWithinCircle } from "@/lib/utils/geo";
import { getActiveZones } from "@/lib/adjudicator/zones";
import { checkWeatherTriggers } from "@/lib/adjudicator/triggers/weather";
import { checkNewsTriggers } from "@/lib/adjudicator/triggers/news";
import { checkTrafficTriggers } from "@/lib/adjudicator/triggers/traffic";
import { isDuplicateEvent, insertDisruptionEvent } from "@/lib/adjudicator/events";
import { processClaimsForEvent } from "@/lib/adjudicator/claims";
import { appendParametricLedgerEntry } from "@/lib/adjudicator/ledger";
import { logRun } from "@/lib/adjudicator/payouts";
import type {
  AdjudicatorResult,
  DemoTriggerOptions,
  ParametricLedgerOutcome,
  ProcessTriggerResult,
  TriggerCandidate,
} from "@/lib/adjudicator/types";
import { randomUUID } from "crypto";

export interface AdjudicatorRunOptions {
  demoTrigger?: DemoTriggerOptions;
  suppressSystemLog?: boolean;
  demoLogExtras?: Record<string, unknown>;
}

export type { AdjudicatorResult, DemoTriggerOptions, TriggerCandidate, ProcessTriggerResult };

function demoTelemetryFromTrigger(
  d: DemoTriggerOptions,
): Record<string, unknown> {
  return {
    demo_event_subtype: d.eventSubtype,
    demo_lat: d.lat,
    demo_lng: d.lng,
    demo_radius_km: d.radiusKm ?? null,
    demo_severity: d.severity ?? null,
    demo_rider_id: d.riderId ?? null,
  };
}

const BATCH_SIZE = 5;

/**
 * Processes a single disruption trigger, checks for idempotency, and initiates the claims pipeline.
 *
 * @param supabase - Admin client instance for bypassing RLS during processing
 * @param candidate - The newly identified trigger event
 * @param options - Configure idempotency overrides or constrain targeting to a specific profile
 * @returns Resulting claims created and payouts initiated
 */
export async function processSingleTrigger(
  supabase: ReturnType<typeof createAdminClient>,
  candidate: TriggerCandidate,
  options: {
    skipIdempotency?: boolean;
    restrictToProfileId?: string;
    adjudicatorRunId?: string | null;
  } = {},
): Promise<ProcessTriggerResult> {
  return ensureAdjudicatorRuleContext(supabase, async () => {
    const { skipIdempotency = false, restrictToProfileId, adjudicatorRunId } = options;
    const t0 = Date.now();
    const ctx = getAdjudicatorRuleContext();
    const subtype = String(candidate.subtype ?? "");

    if (subtype && ctx.excludedSubtypes.includes(subtype)) {
      await appendParametricLedgerEntry(supabase, {
        adjudicatorRunId,
        candidate,
        outcome: "no_pay",
        errorMessage: "subtype_excluded_by_rule_set",
        latencyMs: Date.now() - t0,
      });
      return { claimsCreated: 0, payoutsInitiated: 0 };
    }

    if (!skipIdempotency && (await isDuplicateEvent(supabase, candidate))) {
      await appendParametricLedgerEntry(supabase, {
        adjudicatorRunId,
        candidate,
        outcome: "deferred",
        errorMessage: "duplicate_event_within_window",
        latencyMs: Date.now() - t0,
      });
      return { claimsCreated: 0, payoutsInitiated: 0 };
    }

    const event = await insertDisruptionEvent(
      supabase,
      candidate,
      ctx.ruleSetId,
    );
    if (!event) {
      await appendParametricLedgerEntry(supabase, {
        adjudicatorRunId,
        candidate,
        outcome: "deferred",
        errorMessage: "disruption_insert_failed",
        latencyMs: Date.now() - t0,
      });
      return { claimsCreated: 0, payoutsInitiated: 0 };
    }

    const result = await processClaimsForEvent(supabase, event.id, candidate, {
      ...(restrictToProfileId && { restrictToProfileId }),
    });

    const outcome: ParametricLedgerOutcome =
      result.claimsCreated > 0 || result.payoutsInitiated > 0 ? "pay" : "no_pay";

    await appendParametricLedgerEntry(supabase, {
      adjudicatorRunId,
      candidate,
      outcome,
      disruptionEventId: event.id,
      claimsCreated: result.claimsCreated,
      payoutsInitiated: result.payoutsInitiated,
      latencyMs: Date.now() - t0,
    });

    return result;
  });
}

/**
 * Orchestrates the full adjudication lifecycle across all active geographical zones.
 * Gathers triggers from external sources, deduplicates events, and parallelizes claim generation.
 *
 * @param supabase - Admin client instance
 * @param options - Configuration arguments, including manual demo mode overrides
 * @returns Comprehensive summary of the adjudication run metrics
 */
export async function runAdjudicatorCore(
  supabase = createAdminClient(),
  options: AdjudicatorRunOptions = {},
): Promise<AdjudicatorResult & { run_id: string }> {
  const { demoTrigger, suppressSystemLog, demoLogExtras } = options;
  const runId = randomUUID();
  const startMs = Date.now();

  logger.info("adjudicator run started", { runId, is_demo: !!demoTrigger });

  const ruleCtx = await resolveParametricRulesAt(supabase, new Date());
  return runWithAdjudicatorRulesAsync(ruleCtx, async () => {
  const instCtx = { supabase };
  const tomorrowKey = process.env.TOMORROW_IO_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const newsDataKey = process.env.NEWSDATA_IO_API_KEY;
  const waqiKey = process.env.WAQI_API_KEY;
  const tomtomKey = process.env.TOMTOM_API_KEY;

  let allCandidates: TriggerCandidate[] = [];
  let zonesChecked = 0;

  if (demoTrigger) {
    const typeMap: Record<string, "weather" | "traffic" | "social"> = {
      extreme_heat: "weather",
      heavy_rain: "weather",
      severe_aqi: "weather",
      traffic_gridlock: "traffic",
      zone_curfew: "social",
    };
    allCandidates = [
      {
        type: typeMap[demoTrigger.eventSubtype] ?? "weather",
        subtype: demoTrigger.eventSubtype,
        severity: demoTrigger.severity ?? 8,
        geofence: {
          lat: demoTrigger.lat,
          lng: demoTrigger.lng,
          radius_km:
            demoTrigger.radiusKm ?? triggersFromContext().DEFAULT_GEOFENCE_RADIUS_KM,
        },
        raw: {
          trigger: demoTrigger.eventSubtype,
          demo: true,
          source: "admin_demo_mode",
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
            checkWeatherTriggers(z, tomorrowKey, waqiKey, instCtx),
            checkTrafficTriggers(z, tomtomKey, instCtx),
          ]);
          return [...weatherCandidates, ...trafficCandidates];
        }),
      );
      const radiusKm = triggersFromContext().CANDIDATE_DEDUPE_RADIUS_KM;
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
              isWithinCircle(existingLat, existingLng, geofenceLat, geofenceLng, radiusKm)
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
        tomtomKey,
        zones,
        instCtx,
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
    adjudicatorRunId: runId,
  };
  for (let i = 0; i < allCandidates.length; i += concurrency) {
    const batch = allCandidates.slice(i, i + concurrency);
    const outcomes = await Promise.all(
      batch.map((candidate) => processSingleTrigger(supabase, candidate, triggerOptions)),
    );
    for (const outcome of outcomes) {
      claimsCreated += outcome.claimsCreated;
      payoutsInitiated += outcome.payoutsInitiated;
      payoutFailures += outcome.payoutFailures ?? 0;
    }
  }

  const durationMs = Date.now() - startMs;
  const result: AdjudicatorResult = {
    message: demoTrigger ? "Demo adjudicator run complete" : "Adjudicator run complete",
    candidates_found: allCandidates.length,
    claims_created: claimsCreated,
    zones_checked: zonesChecked,
    payouts_initiated: payoutsInitiated,
    payout_failures: payoutFailures > 0 ? payoutFailures : undefined,
  };

  /** Batch demo runs suppress per-step logs; the API writes one aggregate row. */
  const shouldLog = !(demoTrigger && suppressSystemLog);

  let logged = true;
  if (shouldLog) {
    const demo_extras = demoTrigger
      ? {
          ...demoTelemetryFromTrigger(demoTrigger),
          ...(demoLogExtras ?? {}),
        }
      : demoLogExtras && Object.keys(demoLogExtras).length > 0
        ? demoLogExtras
        : undefined;

    logged = await logRun(supabase, {
      ...result,
      duration_ms: durationMs,
      is_demo: !!demoTrigger,
      run_id: runId,
      ...(demo_extras ? { demo_extras } : {}),
    });
    if (!logged) result.log_failures = 1;
  }

  logger.info("adjudicator run finished", {
    runId,
    duration_ms: durationMs,
    candidates_found: result.candidates_found,
    claims_created: result.claims_created,
    payouts_initiated: result.payouts_initiated,
    error: result.error,
  });
  return { ...result, run_id: runId };
  });
}

