import { getCronSecret, isCronSecretRequired } from '@/lib/config/env';
import { RATE_LIMITS } from '@/lib/config/constants';
import { runWeeklyPremiumRecommendations } from '@/lib/pricing/run-weekly-premium-recommendations';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, errorResponse } from '@/lib/utils/api';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Actuarial orchestration cron responsible for computing dynamic weekly premium rates.
 * Synthesizes multidimensional risk factors (Geo-climate history, AI forecasting, Social volatility, 
 * Rider claim frequency) mapped tightly to an 11km geohash cluster model.
 *
 * @param request - Secured cron invocation payload
 * @returns A breakdown denoting successfully processed rider profiles and deduplicated geofenced zones
 */
export async function GET(request: Request) {
  const startedAt = Date.now();
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

  const rateLimited = await checkRateLimit('cron:weekly-premium', {
    maxRequests: RATE_LIMITS.CRON_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const admin = createAdminClient();
    const result = await runWeeklyPremiumRecommendations(admin);
    logger.info('Weekly premium cron completed', {
      durationMs: Date.now() - startedAt,
      processed: result.processed,
      zonesDeduped: result.zonesDeduped,
      weekStartDate: result.week_start_date,
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, 'Weekly premium cron failed');
  }
}
