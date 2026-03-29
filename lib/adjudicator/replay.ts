/**
 * Dry-run / replay: re-evaluate stored disruption payloads against current or hypothetical thresholds.
 */

import { PARAMETRIC_RULE_VERSION, TRIGGERS } from '@/lib/config/constants';
import type { ParametricLedgerOutcome, SupabaseAdmin } from '@/lib/adjudicator/types';

export type ThresholdOverrides = Partial<{
  [K in keyof typeof TRIGGERS]: (typeof TRIGGERS)[K];
}>;

export type ReplayEvaluationRow = {
  disruption_event_id: string;
  event_subtype: string | null;
  created_at: string;
  original_severity: number;
  would_fire: boolean;
  simulated_outcome: ParametricLedgerOutcome;
  reason: string;
  rule_version_applied: string;
};

function effectiveTriggers(overrides?: ThresholdOverrides) {
  return { ...TRIGGERS, ...overrides } as typeof TRIGGERS;
}

function replayExtremeHeat(
  raw: Record<string, unknown>,
  T: typeof TRIGGERS,
): { wouldFire: boolean; reason: string } {
  const hourly = raw.hourly as
    | { time?: string[]; temperature_2m?: (number | null)[] }
    | undefined;
  const times = hourly?.time ?? [];
  const temps = hourly?.temperature_2m ?? [];
  const now = new Date();
  const last3: number[] = [];
  for (let i = times.length - 1; i >= 0 && last3.length < 3; i--) {
    const t = new Date(times[i]);
    if (t <= now) {
      const v = temps[i];
      if (v != null && typeof v === 'number') last3.push(v);
    }
  }
  const sustained =
    last3.length >= T.HEAT_SUSTAINED_HOURS &&
    last3.every((v) => v >= T.HEAT_THRESHOLD_C);

  const vals = (raw.data as { values?: { temperature?: number } } | undefined)?.values;
  const rt = vals?.temperature;
  const instant = rt != null && rt >= T.HEAT_THRESHOLD_C;

  if (sustained) {
    return {
      wouldFire: true,
      reason: `Sustained heat: last ${last3.length} readings ≥ ${T.HEAT_THRESHOLD_C}°C`,
    };
  }
  if (instant) {
    return {
      wouldFire: true,
      reason: `Realtime temperature ${rt}°C ≥ ${T.HEAT_THRESHOLD_C}°C (sustained rule not recomputed from snapshot)`,
    };
  }
  return {
    wouldFire: false,
    reason: `Below heat thresholds (sustained window or realtime temp)`,
  };
}

function replayHeavyRain(raw: Record<string, unknown>, T: typeof TRIGGERS) {
  const vals = (raw.data as { values?: { precipitationIntensity?: number } } | undefined)
    ?.values;
  const precip =
    vals?.precipitationIntensity ??
    (typeof raw.precipitationIntensity === 'number'
      ? raw.precipitationIntensity
      : 0);
  const wouldFire = Number(precip) >= T.RAIN_THRESHOLD_MM_H;
  return {
    wouldFire,
    reason: wouldFire
      ? `Precip intensity ${precip} ≥ ${T.RAIN_THRESHOLD_MM_H} mm/h`
      : `Precip intensity ${precip} < ${T.RAIN_THRESHOLD_MM_H} mm/h`,
  };
}

function replaySevereAqi(raw: Record<string, unknown>, T: typeof TRIGGERS) {
  const current = Number(raw.current_aqi);
  const baseline75 = Number(raw.baseline_p75) || 0;
  const baseline90 = Number(raw.baseline_p90) || 0;
  const chronic = raw.chronic_pollution === true;

  let adaptive = 300;
  if (baseline75 > 0 || baseline90 > 0) {
    if (chronic) {
      adaptive = Math.min(
        T.AQI_MAX_THRESHOLD,
        Math.max(
          T.AQI_CHRONIC_MIN_THRESHOLD,
          Math.round(baseline90 * T.AQI_CHRONIC_MULTIPLIER),
        ),
      );
    } else {
      adaptive = Math.min(
        T.AQI_MAX_THRESHOLD,
        Math.max(
          T.AQI_MIN_THRESHOLD,
          Math.round(baseline75 * T.AQI_EXCESS_MULTIPLIER),
        ),
      );
    }
  }

  const wouldFire = !Number.isNaN(current) && current >= adaptive;
  return {
    wouldFire,
    reason: wouldFire
      ? `AQI ${current} ≥ adaptive ${adaptive} (${chronic ? 'chronic' : 'standard'} zone)`
      : `AQI ${Number.isNaN(current) ? 'n/a' : current} < adaptive ${adaptive}`,
  };
}

function replayTrafficGridlock(raw: Record<string, unknown>, T: typeof TRIGGERS) {
  const llm = raw.llm as { severity?: number; qualifies?: boolean } | undefined;
  if (llm && typeof llm === 'object' && 'qualifies' in llm) {
    const sev = Number(llm.severity ?? 0);
    const wouldFire =
      llm.qualifies === true && sev >= T.LLM_SEVERITY_THRESHOLD;
    return {
      wouldFire,
      reason: wouldFire
        ? `News+LLM traffic: severity ${sev} ≥ ${T.LLM_SEVERITY_THRESHOLD}`
        : `News+LLM traffic: qualifies=${llm.qualifies}, severity ${sev}`,
    };
  }

  const hasClosure = raw.has_road_closure === true;
  const ratio = Number(raw.avg_ratio);
  const congested =
    hasClosure ||
    (!Number.isNaN(ratio) && ratio < T.TRAFFIC_CONGESTION_RATIO_THRESHOLD);
  return {
    wouldFire: congested,
    reason: congested
      ? hasClosure
        ? 'Road closure reported in snapshot'
        : `Congestion ratio ${ratio.toFixed(2)} < ${T.TRAFFIC_CONGESTION_RATIO_THRESHOLD}`
      : `No road closure; ratio ${Number.isNaN(ratio) ? 'n/a' : ratio.toFixed(2)}`,
  };
}

function replayZoneCurfew(raw: Record<string, unknown>, T: typeof TRIGGERS) {
  const llm = raw.llm as { severity?: number; qualifies?: boolean } | undefined;
  const sev = Number(llm?.severity ?? 0);
  const wouldFire =
    llm?.qualifies === true && sev >= T.LLM_SEVERITY_THRESHOLD;
  return {
    wouldFire,
    reason: wouldFire
      ? `LLM severity ${sev} ≥ ${T.LLM_SEVERITY_THRESHOLD}`
      : `LLM qualifies=${llm?.qualifies}, severity ${sev} < ${T.LLM_SEVERITY_THRESHOLD}`,
  };
}

function evaluateSnapshot(
  subtype: string | null,
  raw: Record<string, unknown>,
  T: typeof TRIGGERS,
): { wouldFire: boolean; reason: string } {
  switch (subtype) {
    case 'extreme_heat':
      return replayExtremeHeat(raw, T);
    case 'heavy_rain':
      return replayHeavyRain(raw, T);
    case 'severe_aqi':
      return replaySevereAqi(raw, T);
    case 'traffic_gridlock':
      return replayTrafficGridlock(raw, T);
    case 'zone_curfew':
      return replayZoneCurfew(raw, T);
    default:
      return {
        wouldFire: false,
        reason: `Unsupported or missing subtype for replay: ${subtype ?? '(null)'}`,
      };
  }
}

/**
 * Load disruption events in a time window and re-run rule logic using optional threshold overrides.
 * Does not mutate production state unless caller persists dry-run ledger rows separately.
 */
export async function replayDisruptionsAgainstRules(
  supabase: SupabaseAdmin,
  params: {
    fromIso: string;
    toIso: string;
    thresholdOverrides?: ThresholdOverrides;
    ruleVersionLabel?: string;
  },
): Promise<ReplayEvaluationRow[]> {
  const T = effectiveTriggers(params.thresholdOverrides);
  const ruleVersion =
    params.ruleVersionLabel ?? `${PARAMETRIC_RULE_VERSION}_replay`;

  const { data: events, error } = await supabase
    .from('live_disruption_events')
    .select('id, event_subtype, severity_score, raw_api_data, created_at')
    .gte('created_at', params.fromIso)
    .lte('created_at', params.toIso)
    .order('created_at', { ascending: true });

  if (error || !events?.length) return [];

  return events.map((e) => {
    const raw = (e.raw_api_data ?? {}) as Record<string, unknown>;
    const { wouldFire, reason } = evaluateSnapshot(e.event_subtype ?? null, raw, T);
    const simulated_outcome: ParametricLedgerOutcome = wouldFire ? 'pay' : 'no_pay';
    return {
      disruption_event_id: e.id,
      event_subtype: e.event_subtype ?? null,
      created_at: e.created_at,
      original_severity: Number(e.severity_score),
      would_fire: wouldFire,
      simulated_outcome,
      reason,
      rule_version_applied: ruleVersion,
    };
  });
}

export async function persistReplayDryRunRows(
  supabase: SupabaseAdmin,
  rows: ReplayEvaluationRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const payload = rows.map((r) => ({
    source: 'replay',
    trigger_subtype: r.event_subtype,
    event_type: null as string | null,
    zone_lat: null as number | null,
    zone_lng: null as number | null,
    observed_values: {
      original_severity: r.original_severity,
      would_fire: r.would_fire,
      reason: r.reason,
    },
    rule_version: PARAMETRIC_RULE_VERSION,
    outcome: r.simulated_outcome,
    disruption_event_id: null,
    evidence: {
      kind: 'replay',
      replay_of_disruption_id: r.disruption_event_id,
    },
    is_dry_run: true,
    dry_run_rule_version: r.rule_version_applied,
    replay_of_disruption_id: r.disruption_event_id,
  }));

  const { error } = await supabase.from('parametric_trigger_ledger').insert(payload);
  if (error) return 0;
  return rows.length;
}
