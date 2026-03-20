/**
 * Payout simulation and run logging for the adjudicator.
 */

import { logger } from '@/lib/logger';
import type { SupabaseAdmin, AdjudicatorResult } from '@/lib/adjudicator/types';

/**
 * Simulates a rider claim payout and records the transaction into the ledger.
 *
 * @param supabase - Admin client instance
 * @param claimId - Unique identifier of the approved claim
 * @param profileId - Recipient rider profile
 * @param amountInr - Transaction volume in INR
 * @param runId - Optional correlation identifier for the adjudication lifecycle
 * @returns Boolean indicating whether the ledger insertion succeeded
 */
export async function simulatePayout(
  supabase: SupabaseAdmin,
  claimId: string,
  profileId: string,
  amountInr: number,
  runId?: string | null,
): Promise<boolean> {
  try {
    const mockUpiRef = `OASIS_UPI_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { error } = await supabase.from('payout_ledger').insert({
      claim_id: claimId,
      profile_id: profileId,
      amount_inr: amountInr,
      payout_method: 'upi_instant',
      status: 'completed',
      mock_upi_ref: mockUpiRef,
      completed_at: new Date().toISOString(),
      metadata: {
        gateway: 'stripe_connect',
        auto: true,
        demo: true,
      },
    });

    if (error) {
      logger.error('payout_ledger insert failed', {
        runId: runId ?? undefined,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('simulatePayout error', {
      runId: runId ?? undefined,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export interface LogRunInput extends AdjudicatorResult {
  duration_ms: number;
  error?: string;
  is_demo?: boolean;
}

/**
 * Persists the final metrics and telemetry of an adjudication run to the system logs.
 *
 * @param supabase - Admin client instance
 * @param result - Aggregated metrics including candidate counts and payout failures
 * @returns Boolean indicating whether the telemetry was successfully persisted
 */
export async function logRun(
  supabase: SupabaseAdmin,
  result: LogRunInput,
): Promise<boolean> {
  const runId = result.run_id ?? undefined;
  try {
    const { error } = await supabase.from('system_logs').insert({
      event_type: result.is_demo ? 'adjudicator_demo' : 'adjudicator_run',
      severity: result.error ? 'error' : result.payout_failures ?? result.log_failures ? 'warning' : 'info',
      metadata: {
        run_id: runId,
        candidates_found: result.candidates_found,
        claims_created: result.claims_created,
        zones_checked: result.zones_checked,
        payouts_initiated: result.payouts_initiated,
        duration_ms: result.duration_ms,
        error: result.error ?? null,
        payout_failures: result.payout_failures ?? null,
        log_failures: result.log_failures ?? null,
      },
    });

    if (error) {
      logger.error('system_logs insert failed', {
        runId,
        event_type: result.is_demo ? 'adjudicator_demo' : 'adjudicator_run',
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('logRun error', {
      runId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
