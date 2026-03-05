import { runAdjudicator } from '@/lib/adjudicator/run';
import { RATE_LIMITS } from '@/lib/config/constants';
import { checkRateLimit, errorResponse } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/adjudicator
 *
 * Vercel Cron job that runs the parametric adjudicator hourly.
 * Authenticates via CRON_SECRET header. Rate limited.
 */
export async function GET(request: Request) {
  // Rate limit cron calls
  const rateLimited = checkRateLimit('cron:adjudicator', {
    maxRequests: RATE_LIMITS.CRON_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  // Auth: Vercel sends CRON_SECRET in Authorization header
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await runAdjudicator();
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, 'Adjudicator cron failed');
  }
}
