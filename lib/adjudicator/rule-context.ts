import { AsyncLocalStorage } from 'async_hooks';
import { PARAMETRIC_RULE_VERSION, TRIGGERS } from '@/lib/config/constants';
import type { SupabaseAdmin } from '@/lib/adjudicator/types';
import {
  resolveParametricRulesAt,
  type ResolvedParametricRules,
} from '@/lib/parametric-rules/resolve';
import type { TriggersConfig } from '@/lib/config/constants';
import type { PayoutLadderStep } from '@/lib/parametric-rules/types';

export type AdjudicatorRuleContext = ResolvedParametricRules;

const storage = new AsyncLocalStorage<AdjudicatorRuleContext>();

export function getAdjudicatorRuleContext(): AdjudicatorRuleContext {
  return (
    storage.getStore() ?? {
      triggers: TRIGGERS,
      ruleSetId: null,
      versionLabel: PARAMETRIC_RULE_VERSION,
      payoutLadder: [{ severity_min: 0, severity_max: 10, multiplier: 1 }],
      excludedSubtypes: [],
    }
  );
}

export function runWithAdjudicatorRules<T>(ctx: AdjudicatorRuleContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export async function runWithAdjudicatorRulesAsync<T>(
  ctx: AdjudicatorRuleContext,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(ctx, fn);
}

export async function ensureAdjudicatorRuleContext<T>(
  supabase: SupabaseAdmin,
  fn: () => Promise<T>,
  at: Date = new Date(),
): Promise<T> {
  if (storage.getStore()) return fn();
  const ctx = await resolveParametricRulesAt(supabase, at);
  return storage.run(ctx, fn);
}

export function triggersFromContext(): TriggersConfig {
  return getAdjudicatorRuleContext().triggers;
}

export function payoutLadderFromContext(): PayoutLadderStep[] {
  return getAdjudicatorRuleContext().payoutLadder;
}
