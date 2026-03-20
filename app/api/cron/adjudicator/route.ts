import { getCronSecret, isCronSecretRequired } from '@/lib/config/env';
import { runAdjudicator } from '@/lib/adjudicator/run';
import { RATE_LIMITS } from '@/lib/config/constants';
import { checkRateLimit, errorResponse } from '@/lib/utils/api';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
  }
}
