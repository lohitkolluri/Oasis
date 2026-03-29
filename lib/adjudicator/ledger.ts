/**
 * Append-only parametric trigger ledger + per-source health updates.
 */

import { PARAMETRIC_RULE_VERSION } from '@/lib/config/constants';
import { getAdjudicatorRuleContext } from '@/lib/adjudicator/rule-context';
import type {
  ParametricLedgerOutcome,
  RawTriggerData,
  SupabaseAdmin,
  TriggerCandidate,
} from '@/lib/adjudicator/types';
import { logger } from '@/lib/logger';

export interface AppendLedgerInput {
  adjudicatorRunId?: string | null;
  candidate: TriggerCandidate;
  outcome: ParametricLedgerOutcome;
  ruleVersion?: string;
  disruptionEventId?: string | null;
  claimsCreated?: number;
  payoutsInitiated?: number;
  latencyMs?: number | null;
  errorMessage?: string | null;
  isDryRun?: boolean;
  dryRunRuleVersion?: string | null;
  replayOfDisruptionId?: string | null;
  ruleSetId?: string | null;
}

/** Slim, governance-friendly snapshot of what the rules saw (not full API payloads). */
export function normalizeObservedValues(raw: RawTriggerData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const copy = (k: string) => {
    const v = raw[k];
    if (v !== undefined && v !== null) out[k] = v;
  };

  copy('trigger');
  copy('source');
  copy('demo');
  copy('current_aqi');
  copy('adaptive_threshold');
  copy('baseline_p75');
  copy('baseline_p90');
  copy('baseline_mean');
  copy('chronic_pollution');
  copy('historical_days');
  copy('excess_percent');
  copy('avg_ratio');
  copy('congested_points');
  copy('sample_points');
  copy('has_road_closure');
  copy('precipitationIntensity');

  const llm = raw.llm;
  if (llm && typeof llm === 'object' && !Array.isArray(llm)) {
    const L = llm as Record<string, unknown>;
    out.llm = {
      qualifies: L.qualifies,
      severity: L.severity,
      zone: typeof L.zone === 'string' ? L.zone.slice(0, 120) : L.zone,
    };
  }

  const vals = raw.data;
  if (vals && typeof vals === 'object' && !Array.isArray(vals)) {
    const v = (vals as { values?: Record<string, unknown> }).values;
    if (v && typeof v === 'object') {
      out.temperature = v.temperature;
      out.precipitationIntensity = v.precipitationIntensity;
    }
  }

  return out;
}

export function resolveLedgerSource(candidate: TriggerCandidate): string {
  const s = candidate.raw?.source;
  if (typeof s === 'string' && s.trim().length > 0) return s.trim();

  switch (candidate.subtype) {
    case 'extreme_heat':
      return 'openmeteo_forecast';
    case 'heavy_rain':
      return 'tomorrow_io';
    case 'severe_aqi':
      return 'aqi_composite';
    case 'traffic_gridlock': {
      const src = candidate.raw?.source;
      if (typeof src === 'string' && src.length > 0) return src;
      return candidate.type === 'social' ? 'newsdata_openrouter' : 'tomtom_traffic';
    }
    case 'zone_curfew':
      return 'news_llm';
    default:
      return 'unknown';
  }
}

function buildEvidence(
  disruptionEventId: string | null | undefined,
  candidate: TriggerCandidate,
): Record<string, unknown> {
  const ref: Record<string, unknown> = {
    kind: 'live_disruption_events',
  };
  if (disruptionEventId) ref.disruption_event_id = disruptionEventId;
  ref.trigger_subtype = candidate.subtype;
  ref.event_type = candidate.type;
  return ref;
}

export async function appendParametricLedgerEntry(
  supabase: SupabaseAdmin,
  input: AppendLedgerInput,
): Promise<boolean> {
  const {
    candidate,
    outcome,
    adjudicatorRunId,
    ruleVersion: inputRuleVersion,
    disruptionEventId,
    claimsCreated = 0,
    payoutsInitiated = 0,
    latencyMs,
    errorMessage,
    isDryRun = false,
    dryRunRuleVersion,
    replayOfDisruptionId,
    ruleSetId: inputRuleSetId,
  } = input;

  const ctx = getAdjudicatorRuleContext();
  const ruleSetId = inputRuleSetId ?? ctx.ruleSetId ?? null;
  const versionLabel =
    inputRuleVersion != null && inputRuleVersion !== ''
      ? inputRuleVersion
      : (ctx.versionLabel || PARAMETRIC_RULE_VERSION);

  const gf = candidate.geofence;
  const row = {
    adjudicator_run_id: adjudicatorRunId ?? null,
    source: resolveLedgerSource(candidate),
    trigger_subtype: candidate.subtype,
    event_type: candidate.type,
    zone_lat: gf?.lat ?? null,
    zone_lng: gf?.lng ?? null,
    observed_values: normalizeObservedValues(candidate.raw),
    rule_version: versionLabel,
    rule_set_id: ruleSetId,
    outcome,
    disruption_event_id: disruptionEventId ?? null,
    evidence: buildEvidence(disruptionEventId ?? null, candidate),
    claims_created: claimsCreated,
    payouts_initiated: payoutsInitiated,
    latency_ms: latencyMs ?? null,
    error_message: errorMessage ?? null,
    is_dry_run: isDryRun,
    dry_run_rule_version: dryRunRuleVersion ?? null,
    replay_of_disruption_id: replayOfDisruptionId ?? null,
  };

  const { error } = await supabase.from('parametric_trigger_ledger').insert(row);
  if (error) {
    logger.error('parametric_trigger_ledger insert failed', { message: error.message });
    return false;
  }

  return true;
}

export interface SourceHealthTouch {
  ok: boolean;
  latencyMs?: number;
  observedAt: string;
  errorDetail?: string;
  isFallback?: boolean;
  fallbackOf?: string | null;
}

export async function mergeSourceHealth(
  supabase: SupabaseAdmin,
  sourceId: string,
  touch: SourceHealthTouch,
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('touch_parametric_source_health', {
    p_source_id: sourceId,
    p_ok: touch.ok,
    p_latency_ms: touch.latencyMs ?? null,
    p_observed_at: touch.observedAt,
    p_is_fallback: touch.isFallback === undefined ? null : touch.isFallback,
    p_fallback_of: touch.fallbackOf === undefined ? null : touch.fallbackOf,
  });

  if (!rpcError) return;

  logger.warn('touch_parametric_source_health RPC failed, falling back to client merge', {
    sourceId,
    message: rpcError.message,
  });

  await mergeSourceHealthClientUpsert(supabase, sourceId, touch);
}

/** Legacy read-modify-write (race-prone under parallel zones); used if RPC is missing. */
async function mergeSourceHealthClientUpsert(
  supabase: SupabaseAdmin,
  sourceId: string,
  touch: SourceHealthTouch,
): Promise<void> {
  const { data: existing } = await supabase
    .from('parametric_source_health')
    .select(
      'error_streak,success_streak,avg_latency_ms,last_latency_ms,last_success_at,last_error_at,is_fallback,fallback_of',
    )
    .eq('source_id', sourceId)
    .maybeSingle();

  const prevE = existing?.error_streak ?? 0;
  const prevS = existing?.success_streak ?? 0;
  const error_streak = touch.ok ? 0 : prevE + 1;
  const success_streak = touch.ok ? prevS + 1 : 0;

  let avg_latency_ms = existing?.avg_latency_ms ?? null;
  if (touch.ok && touch.latencyMs != null) {
    avg_latency_ms =
      avg_latency_ms == null
        ? touch.latencyMs
        : avg_latency_ms * 0.85 + touch.latencyMs * 0.15;
  }

  const row = {
    source_id: sourceId,
    last_observed_at: touch.observedAt,
    last_success_at: touch.ok
      ? touch.observedAt
      : (existing?.last_success_at as string | null | undefined) ?? null,
    last_error_at: touch.ok
      ? (existing?.last_error_at as string | null | undefined) ?? null
      : touch.observedAt,
    error_streak,
    success_streak,
    avg_latency_ms,
    last_latency_ms: touch.latencyMs ?? existing?.last_latency_ms ?? null,
    is_fallback:
      touch.isFallback ?? (existing?.is_fallback as boolean | undefined) ?? false,
    fallback_of:
      touch.fallbackOf ??
      (existing?.fallback_of as string | null | undefined) ??
      null,
    updated_at: touch.observedAt,
  };

  const { error } = await supabase.from('parametric_source_health').upsert(row, {
    onConflict: 'source_id',
  });
  if (error) {
    logger.warn('parametric_source_health upsert failed', {
      sourceId,
      message: error.message,
    });
  }
}
