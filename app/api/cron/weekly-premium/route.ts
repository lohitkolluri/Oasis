import { DEFAULT_ZONE, RATE_LIMITS } from '@/lib/config/constants';
import {
    calculatePremiumWithLlm,
    getForecastRiskFactor,
    getHistoricalEventCount,
} from '@/lib/ml/premium-calc';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, errorResponse } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/weekly-premium
 *
 * Compute premium recommendations for all profiles.
 * B3 fix: proper handling when zone coords are missing (uses DEFAULT_ZONE).
 * M1: uses LLM-assisted premium calculation.
 */
export async function GET(request: Request) {
  const rateLimited = checkRateLimit('cron:weekly-premium', {
    maxRequests: RATE_LIMITS.CRON_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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

    // Deduplicate zones for API calls (same cluster = same forecast)
    const zoneCache = new Map<string, { historicalEvents: number; forecastRisk: number }>();
    function clusterKey(lat: number, lng: number): string {
      return `${Math.round(lat * 10) / 10},${Math.round(lng * 10) / 10}`;
    }

    let processed = 0;
    const BATCH_SIZE = 5;

    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (profile) => {
          // B3 fix: use DEFAULT_ZONE when coordinates are missing
          const lat = profile.zone_latitude ?? DEFAULT_ZONE.lat;
          const lng = profile.zone_longitude ?? DEFAULT_ZONE.lng;
          const key = clusterKey(lat, lng);

          let cached = zoneCache.get(key);
          if (!cached) {
            const [historicalEvents, forecastRisk] = await Promise.all([
              getHistoricalEventCount(admin, lat, lng),
              getForecastRiskFactor(admin, lat, lng),
            ]);
            cached = { historicalEvents, forecastRisk };
            zoneCache.set(key, cached);
          }

          // M1: use LLM-assisted premium calculation
          const { premium, reasoning, source } = await calculatePremiumWithLlm({
            zoneLatitude: lat,
            zoneLongitude: lng,
            historicalEventCount: cached.historicalEvents,
            forecastRiskFactor: cached.forecastRisk,
            platform: profile.platform,
          });

          // Compute next Monday as week_start_date
          const now = new Date();
          const dayOfWeek = now.getDay();
          const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
          const nextMonday = new Date(now);
          nextMonday.setDate(now.getDate() + daysUntilMonday);
          const weekStartDate = nextMonday.toISOString().split('T')[0];

          await admin.from('premium_recommendations').upsert(
            {
              profile_id: profile.id,
              week_start_date: weekStartDate,
              recommended_premium_inr: premium,
              risk_factors: {
                historical_events: cached.historicalEvents,
                forecast_risk: cached.forecastRisk,
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
