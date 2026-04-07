import { runAdjudicator } from '@/lib/adjudicator/run';
import { RATE_LIMITS } from '@/lib/config/constants';
import { getCronSecret, isCronSecretRequired } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, errorResponse } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const ADJUDICATOR_LOCK_KEY = 9_110_001; // stable per-app lock key

/**
 * Automated hourly orchestration hook for the Parametric Adjudicator.
 * Ingests temporal platform limits and triggers system-wide policy evaluation automatically.
 *
 * @param request - Inbound cron invocation containing the secured bearer token
 * @returns Serialized run ID mapping to exhaustive execution metrics
 */
export async function GET(request: Request) {
  const cronSecret = getCronSecret();
  if (isCronSecretRequired() && !cronSecret) {
    return NextResponse.json(
      { error: 'Cron not configured. Set CRON_SECRET in production.' },
      { status: 503 },
    );
  }

  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const rateLimited = await checkRateLimit('cron:adjudicator', {
    maxRequests: RATE_LIMITS.CRON_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const admin = createAdminClient();

  // Mutual-exclusion guard: only one adjudicator run at a time.
  const { data: locked } = await admin.rpc('oasis_try_advisory_lock', {
    p_key: Number(ADJUDICATOR_LOCK_KEY),
  });
  if (locked !== true) {
    logger.info('Adjudicator cron skipped: another run is already in progress');
    return NextResponse.json({ skipped: true, reason: 'Run already in progress' });
  }

  try {
    const result = await runAdjudicator();
    return NextResponse.json(result, {
      headers: result.run_id ? { 'x-request-id': result.run_id } : undefined,
    });
  } catch (err) {
    logger.error('Adjudicator cron failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err, 'Adjudicator cron failed');
  } finally {
    await admin.rpc('oasis_advisory_unlock', {
      p_key: Number(ADJUDICATOR_LOCK_KEY),
    });
  }
}
