import { getCronSecret, isCronSecretRequired } from '@/lib/config/env';
import { DEFAULT_ZONE, RATE_LIMITS, PREMIUM } from '@/lib/config/constants';
import {
    calculateDynamicPremium,
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
    let computedWeekStartDate: string | null = null;

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

          const engineOutput = calculateDynamicPremium({
            zoneRiskFactors: {
               heatEvents: 0,
               rainEvents: cached.historicalEvents,
               trafficEvents: 0,
               socialEvents: 0,
            },
            forecastRisk: cached.forecastRisk,
            platform: profile.platform ?? undefined,
            socialStrikeFrequency: cached.socialRisk,
            riderClaimFrequency: Math.min(1.0, (claimCount4w ?? 0) / 4), // 4 claims = 1.0 (max behavior risk)
          });
          const premium = engineOutput.final_premium;
          const reasoning = engineOutput.explanation;
          const source = 'model';

          const now = new Date();
          const dayOfWeek = now.getDay();
          const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
          const nextMonday = new Date(now);
          nextMonday.setDate(now.getDate() + daysUntilMonday);
          const weekStartDate = toDateString(nextMonday);
          computedWeekStartDate = computedWeekStartDate ?? weekStartDate;

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

    // Optional: persist a model-derived plan pricing snapshot for next week (audit trail)
    // Uses the distribution of premium_recommendations and maps percentiles to tier prices.
    if (computedWeekStartDate) {
      try {
        const { data: activePlans } = await admin
          .from('plan_packages')
          .select('id, sort_order, is_active')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        const plans = (activePlans ?? []) as Array<{ id: string; sort_order: number }>;

        const { data: recs } = await admin
          .from('premium_recommendations')
          .select('recommended_premium_inr')
          .eq('week_start_date', computedWeekStartDate);

        const values = (recs ?? [])
          .map((r: any) => Number(r.recommended_premium_inr))
          .filter((n: number) => Number.isFinite(n))
          .sort((a: number, b: number) => a - b);

        function pct(p: number): number {
          if (values.length === 0) return 0;
          if (values.length === 1) return values[0]!;
          const idx = (values.length - 1) * p;
          const lo = Math.floor(idx);
          const hi = Math.ceil(idx);
          if (lo === hi) return values[lo]!;
          const w = idx - lo;
          return values[lo]! * (1 - w) + values[hi]! * w;
        }

        if (plans.length >= 3 && values.length > 0) {
          // Base the forecast strictly on the median standard premium multiplier logic 
          // to perfectly mirror the UI tiers (Basic 0.7x, Standard 1.0x, Premium 1.3x)
          const medianStandard = pct(0.5);
          const predicted = [
            Math.max(PREMIUM.BASE, Math.round(medianStandard * 0.7)),
            Math.round(medianStandard),
            Math.min(PREMIUM.MAX * 1.5, Math.round(medianStandard * 1.3)),
          ];

          await Promise.all(
            plans.slice(0, 3).map((p, i) =>
              admin.from('plan_pricing_snapshots').upsert(
                {
                  week_start_date: computedWeekStartDate,
                  plan_id: p.id,
                  weekly_premium_inr: predicted[i]!,
                  source: 'model',
                },
                { onConflict: 'week_start_date,plan_id' },
              ),
            ),
          );
        }
      } catch {
        // Best-effort only — cron should still succeed even if snapshots aren't configured yet.
      }
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
