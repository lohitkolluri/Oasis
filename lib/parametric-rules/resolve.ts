import { PARAMETRIC_RULE_VERSION, TRIGGERS } from '@/lib/config/constants';
import type { SupabaseAdmin } from '@/lib/adjudicator/types';
import { parsePayoutLadder } from '@/lib/parametric-rules/payout-ladder';
import type {
  ParametricRuleSetRow,
  PayoutLadderStep,
  TriggersConfig,
} from '@/lib/parametric-rules/types';

const TRIGGER_KEYS = Object.keys(TRIGGERS) as (keyof TriggersConfig)[];

export function mergeTriggersPartial(partial: Record<string, unknown> | null | undefined): TriggersConfig {
  const base = { ...TRIGGERS };
  if (!partial || typeof partial !== 'object') return base;
  for (const key of TRIGGER_KEYS) {
    const v = partial[key as string];
    if (typeof v === 'number' && Number.isFinite(v)) {
      (base as Record<string, number>)[key as string] = v;
    }
  }
  return base;
}

async function fetchParametricRuleSetAt(
  supabase: SupabaseAdmin,
  at: Date,
): Promise<ParametricRuleSetRow | null> {
  const iso = at.toISOString();
  const { data, error } = await supabase
    .from('parametric_rule_sets')
    .select(
      'id,created_at,version_label,effective_from,effective_until,triggers,payout_ladder,excluded_subtypes,notes,created_by',
    )
    .lte('effective_from', iso)
    .order('effective_from', { ascending: false })
    .limit(20);

  if (error || !data?.length) {
    return null;
  }
  const row = data.find(
    (r) =>
      r.effective_until == null || new Date(r.effective_until as string).getTime() > at.getTime(),
  );
  return (row ?? null) as ParametricRuleSetRow | null;
}

export type ResolvedParametricRules = {
  triggers: TriggersConfig;
  ruleSetId: string | null;
  versionLabel: string;
  payoutLadder: PayoutLadderStep[];
  excludedSubtypes: string[];
};

export async function resolveParametricRulesAt(
  supabase: SupabaseAdmin,
  at: Date = new Date(),
): Promise<ResolvedParametricRules> {
  const row = await fetchParametricRuleSetAt(supabase, at);
  if (!row) {
    return {
      triggers: TRIGGERS,
      ruleSetId: null,
      versionLabel: PARAMETRIC_RULE_VERSION,
      payoutLadder: parsePayoutLadder(null),
      excludedSubtypes: [],
    };
  }
  return {
    triggers: mergeTriggersPartial(row.triggers),
    ruleSetId: row.id,
    versionLabel: row.version_label,
    payoutLadder: parsePayoutLadder(row.payout_ladder),
    excludedSubtypes: Array.isArray(row.excluded_subtypes)
      ? row.excluded_subtypes.filter((s): s is string => typeof s === 'string')
      : [],
  };
}
