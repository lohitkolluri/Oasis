/**
 * POST /api/admin/demo-trigger/batch
 * Runs 1–8 synthetic triggers in sequence with an optional pause between each.
 * Writes a single `adjudicator_demo` system_log with step breakdown (per-step logs suppressed).
 */
import { logRun } from '@/lib/adjudicator/payouts';
import { runAdjudicator } from '@/lib/adjudicator/run';
import { getOrCreateRequestId, logger } from '@/lib/logger';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { sanitizeErrorMessage } from '@/lib/utils/api';
import { jsonWithRequestId } from '@/lib/utils/request-response';
import { parseWithSchema } from '@/lib/validations/parse';
import { demoBatchSchema } from '@/lib/validations/schemas';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = withAdminAuth(async (ctx, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonWithRequestId(request, { error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseWithSchema(demoBatchSchema, body, request);
  if (!parsed.success) return parsed.response;

  const { steps, pauseBetweenMs, riderId, batchLabel } = parsed.data;
  const admin = ctx.admin;
  const stepDetails: Array<{
    eventSubtype: string;
    claims_created: number;
    payouts_initiated: number;
    run_id: string;
    payout_failures?: number;
  }> = [];

  let claimsCreated = 0;
  let payoutsInitiated = 0;
  let payoutFailures = 0;
  const start = Date.now();

  try {
    for (let i = 0; i < steps.length; i++) {
      if (i > 0 && pauseBetweenMs > 0) {
        await new Promise((r) => setTimeout(r, pauseBetweenMs));
      }
      const step = steps[i]!;
      const demoTrigger = {
        eventSubtype: step.eventSubtype,
        lat: step.lat,
        lng: step.lng,
        radiusKm: step.radiusKm ?? 15,
        severity: step.severity ?? 8,
        ...(riderId && { riderId }),
      };

      const r = await runAdjudicator({
        demoTrigger,
        suppressSystemLog: true,
        demoLogExtras: {
          batch_step_index: i,
          batch_step_total: steps.length,
          batch_label: batchLabel ?? null,
        },
      });

      claimsCreated += r.claims_created;
      payoutsInitiated += r.payouts_initiated;
      payoutFailures += r.payout_failures ?? 0;
      stepDetails.push({
        eventSubtype: step.eventSubtype,
        claims_created: r.claims_created,
        payouts_initiated: r.payouts_initiated,
        run_id: r.run_id,
        ...(r.payout_failures ? { payout_failures: r.payout_failures } : {}),
      });
    }

    const durationMs = Date.now() - start;
    const batchRunId = randomUUID();

    await logRun(admin, {
      candidates_found: steps.length,
      claims_created: claimsCreated,
      zones_checked: steps.length,
      payouts_initiated: payoutsInitiated,
      payout_failures: payoutFailures > 0 ? payoutFailures : undefined,
      message: 'Demo batch adjudicator complete',
      duration_ms: durationMs,
      is_demo: true,
      run_id: batchRunId,
      demo_extras: {
        demo_batch: true,
        batch_label: batchLabel ?? null,
        batch_step_count: steps.length,
        pause_between_ms: pauseBetweenMs,
        demo_rider_id: riderId ?? null,
        batch_steps: stepDetails,
      },
    });

    return jsonWithRequestId(request, {
      ok: true,
      demo: true,
      batch: true,
      steps_run: steps.length,
      claims_created: claimsCreated,
      payouts_initiated: payoutsInitiated,
      payout_failures: payoutFailures > 0 ? payoutFailures : undefined,
      zones_checked: steps.length,
      duration_ms: durationMs,
      run_id: batchRunId,
      step_details: stepDetails,
      pause_between_ms: pauseBetweenMs,
    });
  } catch (err) {
    logger.error('Demo batch trigger failed', {
      requestId: getOrCreateRequestId(request),
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonWithRequestId(
      request,
      { error: sanitizeErrorMessage(err, 'Demo batch failed') },
      { status: 500 },
    );
  }
});
