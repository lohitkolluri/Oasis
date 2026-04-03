import { logger } from '@/lib/logger';
import type { SupabaseAdmin } from '@/lib/adjudicator/types';

export type HoldStage = 'pre_claim' | 'pre_payout';

export type HoldTrailEntry = {
  at: string;
  check: string;
  reason: string;
  facts?: Record<string, unknown>;
};

export interface CreateAutomatedHoldInput {
  supabase: SupabaseAdmin;
  stage: HoldStage;
  profileId: string;
  reason: string;
  checkName: string;
  facts?: Record<string, unknown>;
  claimId?: string | null;
  policyId?: string | null;
  disruptionEventId?: string | null;
}

export async function createAutomatedHold(input: CreateAutomatedHoldInput): Promise<void> {
  const {
    supabase,
    stage,
    profileId,
    reason,
    checkName,
    facts,
    claimId,
    policyId,
    disruptionEventId,
  } = input;

  const entry: HoldTrailEntry = {
    at: new Date().toISOString(),
    check: checkName,
    reason,
    ...(facts ? { facts } : {}),
  };

  try {
    await supabase.from('automated_holds').insert({
      stage,
      claim_id: claimId ?? null,
      policy_id: policyId ?? null,
      profile_id: profileId,
      disruption_event_id: disruptionEventId ?? null,
      hold_type: 'abuse',
      reason,
      reason_trail: [entry],
      status: 'held',
    });
  } catch (err) {
    logger.warn('automated_holds insert failed', {
      stage,
      profileId,
      claimId: claimId ?? null,
      policyId: policyId ?? null,
      disruptionEventId: disruptionEventId ?? null,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    await supabase.from('system_logs').insert({
      event_type: 'payout_hold',
      severity: 'warning',
      metadata: {
        stage,
        profile_id: profileId,
        claim_id: claimId ?? null,
        policy_id: policyId ?? null,
        disruption_event_id: disruptionEventId ?? null,
        check: checkName,
        reason,
        facts: facts ?? null,
      },
    });
  } catch (err) {
    logger.warn('system_logs payout_hold insert failed', {
      stage,
      profileId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

