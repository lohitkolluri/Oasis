import type { TriggersConfig } from '@/lib/config/constants';

export type { TriggersConfig };

export type PayoutLadderStep = {
  severity_min: number;
  severity_max: number;
  multiplier: number;
};

export type ParametricRuleSetRow = {
  id: string;
  created_at: string;
  version_label: string;
  effective_from: string;
  effective_until: string | null;
  triggers: Record<string, unknown>;
  payout_ladder: unknown;
  excluded_subtypes: string[];
  notes: string | null;
  created_by: string | null;
};
