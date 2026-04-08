import { DEFAULT_ZONE, PREMIUM } from '@/lib/config/constants';
import {
  calculateDynamicPremium,
  getForecastRiskFactor,
  getHistoricalEventCountFromEvents,
  getSocialRiskFactorFromEvents,
} from '@/lib/ml/premium-calc';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clusterKey } from '@/lib/utils/geo';
import { getPolicyWeekRange } from '@/lib/utils/policy-week';

export type RunWeeklyPremiumRecommendationsResult = {
  message: string;
  processed: number;
  zonesDeduped: number;
  /** Enrollment Monday (IST) used for premium_recommendations / snapshots */
  week_start_date: string;
};

/**
 * Computes per-profile premium_recommendations and model plan_pricing_snapshots
 * for `getPolicyWeekRange()` enrollment week. Used by cron and admin trigger.
 */
export async function runWeeklyPremiumRecommendations(
  admin: SupabaseClient,
): Promise<RunWeeklyPremiumRecommendationsResult> {
  const { start: premiumWeekStartDate } = getPolicyWeekRange();

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, zone_latitude, zone_longitude, platform, primary_zone_geofence')
    .not('platform', 'is', null);

  if (!profiles || profiles.length === 0) {
    return {
      message: 'No profiles to process',
      processed: 0,
      zonesDeduped: 0,
      week_start_date: premiumWeekStartDate,
    };
  }

  const profileIds = profiles.map((p) => p.id);

  const zoneCache = new Map<
    string,
    { historicalEvents: number; forecastRisk: number; socialRisk: number }
  >();
  let processed = 0;
  const BATCH_SIZE = 5;
  const computedWeekStartDate: string | null = premiumWeekStartDate;

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoStr = fourWeeksAgo.toISOString();

  const historicalSince = new Date();
  historicalSince.setDate(historicalSince.getDate() - PREMIUM.WEEKS_LOOKBACK * 7);

  const [policiesRes, disruptionEventsRes] = await Promise.all([
    admin.from('weekly_policies').select('id, profile_id').in('profile_id', profileIds),
    admin
      .from('live_disruption_events')
      .select('event_type, geofence_polygon')
      .gte('created_at', historicalSince.toISOString()),
  ]);

  const policyRows = (policiesRes.data ?? []) as Array<{ id: string; profile_id: string }>;
  const disruptionEvents = (disruptionEventsRes.data ?? []) as Array<{
    event_type: string | null;
    geofence_polygon: { lat?: number; lng?: number; radius_km?: number } | null;
  }>;

  const policyToProfile = new Map<string, string>();
  const policyIds: string[] = [];
  for (const row of policyRows) {
    if (!row?.id || !row?.profile_id) continue;
    policyToProfile.set(row.id, row.profile_id);
    policyIds.push(row.id);
  }

  const claimCountByProfile = new Map<string, number>();
  if (policyIds.length > 0) {
    const BATCH_POLICY_IDS = 200;
    for (let i = 0; i < policyIds.length; i += BATCH_POLICY_IDS) {
      const policyBatch = policyIds.slice(i, i + BATCH_POLICY_IDS);
      const { data: claimRows } = await admin
        .from('parametric_claims')
        .select('policy_id')
        .gte('created_at', fourWeeksAgoStr)
        .in('policy_id', policyBatch);

      for (const claim of (claimRows ?? []) as Array<{ policy_id: string }>) {
        const profileId = policyToProfile.get(claim.policy_id);
        if (!profileId) continue;
        claimCountByProfile.set(profileId, (claimCountByProfile.get(profileId) ?? 0) + 1);
      }
    }
  }

  const recommendationUpserts: Array<{
    profile_id: string;
    week_start_date: string;
    recommended_premium_inr: number;
    risk_factors: Record<string, unknown>;
  }> = [];

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
            Promise.resolve(getHistoricalEventCountFromEvents(disruptionEvents, lat, lng)),
            getForecastRiskFactor(admin, lat, lng),
            Promise.resolve(getSocialRiskFactorFromEvents(disruptionEvents, lat, lng)),
          ]);
          cached = { historicalEvents, forecastRisk, socialRisk };
          zoneCache.set(key, cached);
        }

        const claimCount4w = claimCountByProfile.get(profile.id) ?? 0;

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
          riderClaimFrequency: Math.min(1.0, claimCount4w / 4),
        });
        const premium = engineOutput.final_premium;
        const reasoning = engineOutput.explanation;
        const source = 'model';

        recommendationUpserts.push({
          profile_id: profile.id,
          week_start_date: premiumWeekStartDate,
          recommended_premium_inr: premium,
          risk_factors: {
            historical_events: cached.historicalEvents,
            forecast_risk: cached.forecastRisk,
            social_risk: cached.socialRisk,
            claim_count_4w: claimCount4w,
            reasoning,
            source,
            zone_lat: lat,
            zone_lng: lng,
          },
        });

        processed++;
      }),
    );
  }

  if (recommendationUpserts.length > 0) {
    const UPSERT_BATCH_SIZE = 200;
    for (let i = 0; i < recommendationUpserts.length; i += UPSERT_BATCH_SIZE) {
      const batch = recommendationUpserts.slice(i, i + UPSERT_BATCH_SIZE);
      await admin.from('premium_recommendations').upsert(batch, {
        onConflict: 'profile_id,week_start_date',
      });
    }
  }

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
        .map((r: { recommended_premium_inr: number }) => Number(r.recommended_premium_inr))
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
        const medianStandard = pct(0.5);
        const STANDARD_MAX_FOR_PREMIUM_HEADROOM = Math.floor(PREMIUM.MAX / 1.3);
        const standardTier = Math.max(
          PREMIUM.BASE,
          Math.min(STANDARD_MAX_FOR_PREMIUM_HEADROOM, Math.round(medianStandard)),
        );
        const predicted = [
          Math.max(PREMIUM.BASE, Math.round(standardTier * 0.7)),
          standardTier,
          Math.min(PREMIUM.MAX, Math.round(standardTier * 1.3)),
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
      // Best-effort only
    }
  }

  return {
    message: 'Weekly premium recommendations computed',
    processed,
    zonesDeduped: zoneCache.size,
    week_start_date: premiumWeekStartDate,
  };
}
