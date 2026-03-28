import type { SupabaseClient } from '@supabase/supabase-js';
import { PREMIUM } from '@/lib/config/constants';
import {
  calculateDynamicPremium,
  getForecastRiskFactor,
  getHistoricalEventCount,
  getSocialRiskFactor,
} from '@/lib/ml/premium-calc';

export type DynamicPlanQuote = {
  weekly_premium_inr: number;
  payout_per_claim_inr: number;
  max_claims_per_week: number;
};

function clampStandard(n: number): number {
  return Math.max(PREMIUM.BASE, Math.min(PREMIUM.MAX, Math.round(n)));
}

function clampPremiumTier(n: number): number {
  return Math.max(PREMIUM.BASE, Math.min(Math.round(PREMIUM.MAX * 1.5), Math.round(n)));
}

function scaleTiersFromEngine(
  engine: ReturnType<typeof calculateDynamicPremium>,
  recommendedStandard: number | null,
): Record<'basic' | 'standard' | 'premium', DynamicPlanQuote> {
  const stdEngine = engine.final_premium;
  const standardPrem =
    recommendedStandard != null ? clampStandard(recommendedStandard) : clampStandard(engine.tier_prices.standard.premium);
  const scale = stdEngine > 0 ? standardPrem / stdEngine : 1;

  const basicPrem = clampStandard(engine.tier_prices.basic.premium * scale);
  const premiumPrem = clampPremiumTier(engine.tier_prices.premium.premium * scale);

  const scaledPayout = (newPrem: number, oldPrem: number, oldPayout: number) => {
    if (oldPrem <= 0) return Math.max(1, Math.round(oldPayout));
    return Math.max(1, Math.round(oldPayout * (newPrem / oldPrem)));
  };

  return {
    basic: {
      weekly_premium_inr: basicPrem,
      payout_per_claim_inr: scaledPayout(basicPrem, engine.tier_prices.basic.premium, engine.tier_prices.basic.payoutBase),
      max_claims_per_week: engine.tier_prices.basic.maxClaims,
    },
    standard: {
      weekly_premium_inr: standardPrem,
      payout_per_claim_inr: scaledPayout(
        standardPrem,
        engine.tier_prices.standard.premium,
        engine.tier_prices.standard.payoutBase,
      ),
      max_claims_per_week: engine.tier_prices.standard.maxClaims,
    },
    premium: {
      weekly_premium_inr: premiumPrem,
      payout_per_claim_inr: scaledPayout(
        premiumPrem,
        engine.tier_prices.premium.premium,
        engine.tier_prices.premium.payoutBase,
      ),
      max_claims_per_week: engine.tier_prices.premium.maxClaims,
    },
  };
}

/**
 * Server-side weekly quotes per plan slug (basic | standard | premium) for a rider and coverage week.
 */
export async function computeDynamicPlanQuotesForProfile(
  supabase: SupabaseClient,
  profileId: string,
  weekStartDate: string,
): Promise<Record<string, DynamicPlanQuote>> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('zone_latitude, zone_longitude, platform')
    .eq('id', profileId)
    .single();

  const zoneLat = profile?.zone_latitude ?? null;
  const zoneLng = profile?.zone_longitude ?? null;

  const [{ data: rec }, eventCount, forecastRisk, socialRisk] = await Promise.all([
    supabase
      .from('premium_recommendations')
      .select('recommended_premium_inr')
      .eq('profile_id', profileId)
      .eq('week_start_date', weekStartDate)
      .maybeSingle(),
    getHistoricalEventCount(supabase, zoneLat, zoneLng),
    getForecastRiskFactor(supabase, zoneLat ?? 12.97, zoneLng ?? 77.59),
    getSocialRiskFactor(supabase, zoneLat, zoneLng),
  ]);

  const recInr = rec?.recommended_premium_inr != null ? Number(rec.recommended_premium_inr) : null;

  const engineOutput = calculateDynamicPremium({
    zoneRiskFactors: {
      heatEvents: 0,
      rainEvents: eventCount,
      trafficEvents: 0,
      socialEvents: 0,
    },
    forecastRisk,
    platform: typeof profile?.platform === 'string' ? profile.platform : undefined,
    socialStrikeFrequency: socialRisk,
    riderClaimFrequency: 0,
  });

  const tiers = scaleTiersFromEngine(engineOutput, recInr);
  return {
    basic: tiers.basic,
    standard: tiers.standard,
    premium: tiers.premium,
  };
}

export async function resolveWeeklyPremiumInrForPlan(
  supabase: SupabaseClient,
  profileId: string,
  planSlug: string,
  weekStartDate: string,
): Promise<number> {
  const quotes = await computeDynamicPlanQuotesForProfile(supabase, profileId, weekStartDate);
  const tier = quotes[planSlug];
  if (tier) return tier.weekly_premium_inr;
  return quotes.standard?.weekly_premium_inr ?? PREMIUM.BASE;
}
