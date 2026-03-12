import { getCronSecret, isCronSecretRequired } from '@/lib/config/env';
import { DEFAULT_ZONE, RATE_LIMITS } from '@/lib/config/constants';
import {
    calculatePremiumWithLlm,
    getForecastRiskFactor,
    getHistoricalEventCount,
    getSocialRiskFactor,
} from '@/lib/ml/premium-calc';
import { createAdminClient } from '@/lib/supabase/admin';
import { clusterKey } from '@/lib/utils/geo';
import { toDateString } from '@/lib/utils/date';
import { checkRateLimit, errorResponse } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/weekly-premium
 *
 * Compute premium recommendations for all profiles.
 * In production CRON_SECRET is required; if missing, returns 503.
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

  const rateLimited = await checkRateLimit('cron:weekly-premium', {
    maxRequests: RATE_LIMITS.CRON_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const admin = createAdminClient();

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, zone_latitude, zone_longitude, platform, primary_zone_geofence')
      .not('platform', 'is', null);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        message: 'No profiles to process',
        processed: 0,
      });
    }

    const zoneCache = new Map<string, { historicalEvents: number; forecastRisk: number; socialRisk: number }>();
    let processed = 0;
    const BATCH_SIZE = 5;

    // Precompute 4-week window for claim frequency and social risk
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const fourWeeksAgoStr = fourWeeksAgo.toISOString();

    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (profile) => {
          const lat = profile.zone_latitude ?? DEFAULT_ZONE.lat;
          const lng = profile.zone_longitude ?? DEFAULT_ZONE.lng;
          const key = clusterKey(lat, lng);

          let cached = zoneCache.get(key);
          if (!cached) {
            const [historicalEvents, forecastRisk, socialRisk] = await Promise.all([
              getHistoricalEventCount(admin, lat, lng),
              getForecastRiskFactor(admin, lat, lng),
              getSocialRiskFactor(admin, lat, lng),
            ]);
            cached = { historicalEvents, forecastRisk, socialRisk };
            zoneCache.set(key, cached);
          }

          // Get rider's claim count in last 4 weeks for claim frequency factor
          const { count: claimCount4w } = await admin
            .from('parametric_claims')
            .select('id', { count: 'exact', head: true })
            .eq('policy_id', profile.id)
            .gte('created_at', fourWeeksAgoStr);

          const { premium, reasoning, source } = await calculatePremiumWithLlm({
            zoneLatitude: lat,
            zoneLongitude: lng,
            historicalEventCount: cached.historicalEvents,
            forecastRiskFactor: cached.forecastRisk,
            socialRiskFactor: cached.socialRisk,
            platform: profile.platform,
            claimCountLast4Weeks: claimCount4w ?? 0,
          });

          const now = new Date();
          const dayOfWeek = now.getDay();
          const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
          const nextMonday = new Date(now);
          nextMonday.setDate(now.getDate() + daysUntilMonday);
          const weekStartDate = toDateString(nextMonday);

          await admin.from('premium_recommendations').upsert(
            {
              profile_id: profile.id,
              week_start_date: weekStartDate,
              recommended_premium_inr: premium,
              risk_factors: {
                historical_events: cached.historicalEvents,
                forecast_risk: cached.forecastRisk,
                social_risk: cached.socialRisk,
                claim_count_4w: claimCount4w ?? 0,
                reasoning,
                source,
                zone_lat: lat,
                zone_lng: lng,
              },
            },
            { onConflict: 'profile_id,week_start_date' },
          );

          processed++;
        }),
      );
    }

    return NextResponse.json({
      message: 'Weekly premium recommendations computed',
      processed,
      zonesDeduped: zoneCache.size,
    });
  } catch (err) {
    return errorResponse(err, 'Weekly premium cron failed');
  }
}
