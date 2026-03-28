/**
 * Dynamic weekly premium calculation engine.
 * Computes deterministic actuarial risk scores by blending historical telemetry,
 * real-time weather/AQI forecasts, and localized social disruption patterns.
 */

import { DEFAULT_ZONE, EXTERNAL_APIS, PREMIUM, PAYOUT_FALLBACK_INR } from '@/lib/config/constants';
import { isWithinCircle } from '@/lib/utils/geo';
import { fetchWithRetry } from '@/lib/utils/retry';
import { getOpenRouterApiKey, getTomorrowApiKey } from '@/lib/config/env';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Month-based seasonal risk multiplier isolating systematic Indian weather volatility.
 * Aligned against historical empirical metrics for major metropolitan areas.
 */
export const SEASONAL_RISK_MULTIPLIER: Record<number, number> = {
  0: 0.85,  // January — winter, low disruption
  1: 0.85,  // February — winter
  2: 1.0,   // March — transition
  3: 1.25,  // April — pre-monsoon heat waves
  4: 1.25,  // May — peak heat wave season
  5: 1.4,   // June — monsoon onset
  6: 1.4,   // July — peak monsoon
  7: 1.4,   // August — monsoon
  8: 1.4,   // September — monsoon retreating
  9: 1.15,  // October — post-monsoon cyclone season
  10: 1.15, // November — cyclone season
  11: 0.85, // December — winter
};

export interface PremiumInput {
  zoneName?: string | null;
  zoneLatitude?: number | null;
  zoneLongitude?: number | null;
  historicalEventCount?: number;
  forecastRiskFactor?: number; // 0–1
  aqiRiskFactor?: number; // 0–1
  socialRiskFactor?: number; // 0–1
  platform?: string | null;
  avgDailyDeliveries?: number | null;
  claimCountLast4Weeks?: number;
}

/**
 * Calculates the weekly premium utilizing a multi-factor risk weighting model.
 * Assesses seasonal adjustments against local climate data and applies behavioral modifiers.
 *
 * @param input - Risk factors and platform exposure statistics
 * @returns Adjusted weekly premium in INR
 */
export function calculateWeeklyPremium(input: PremiumInput): number {
  const events = input.historicalEventCount ?? 0;
  const forecastFactor = input.forecastRiskFactor ?? 0;
  const socialFactor = input.socialRiskFactor ?? 0;

  const riskFromEvents = Math.min(
    events * PREMIUM.RISK_PER_EVENT,
    PREMIUM.MAX - PREMIUM.BASE,
  );

  // Forecast risk already combines weather (70%) + AQI (30%) in getForecastRiskFactor
  const riskFromForecast = forecastFactor * PREMIUM.FORECAST_WEIGHT;
  const riskFromSocial = socialFactor * 8;

  // Platform/volume elasticity
  let volumeMultiplier = 1.0;
  if (input.avgDailyDeliveries != null && input.avgDailyDeliveries > 0) {
    volumeMultiplier = 1.0 + Math.min(0.15, (input.avgDailyDeliveries - 10) * 0.005);
    volumeMultiplier = Math.max(0.9, volumeMultiplier);
  }

  // Seasonal risk multiplier based on Indian monsoon/heat patterns
  const seasonalMultiplier = SEASONAL_RISK_MULTIPLIER[new Date().getMonth()] ?? 1.0;

  // Claim frequency factor: riders with high claim rates see actuarial pressure
  const claims4w = input.claimCountLast4Weeks ?? 0;
  const claimFreqMultiplier = 1.0 + Math.min(0.2, claims4w * 0.04);

  const totalRisk = Math.min(
    riskFromEvents + riskFromForecast + riskFromSocial,
    PREMIUM.MAX - PREMIUM.BASE,
  );

  const rawPremium =
    (PREMIUM.BASE + totalRisk) *
    volumeMultiplier *
    seasonalMultiplier *
    claimFreqMultiplier *
    (1 + PREMIUM.RESERVE_LOAD);
  return Math.min(PREMIUM.MAX, Math.max(PREMIUM.BASE, Math.round(rawPremium)));
}

/**
 * Integrates an intelligent constraint solver to augment actuarial premium generation.
 * Synthesizes cross-domain risk factors, returning sanitized policy values.
 *
 * @param input - Risk factors to be analyzed by the auxiliary model
 * @returns Clamped premium alongside the generated actuarial reasoning string
 */
export async function calculatePremiumWithLlm(
  input: PremiumInput,
): Promise<{ premium: number; reasoning: string; source: 'llm' | 'formula' }> {
  const openRouterKey = getOpenRouterApiKey();

  if (!openRouterKey) {
    return {
      premium: calculateWeeklyPremium(input),
      reasoning: 'Formula-based: multi-factor risk model (LLM unavailable)',
      source: 'formula',
    };
  }

  try {
    const context = {
      historicalEvents: input.historicalEventCount ?? 0,
      forecastRisk: input.forecastRiskFactor ?? 0,
      aqiRisk: input.aqiRiskFactor ?? 0,
      socialRisk: input.socialRiskFactor ?? 0,
      platform: input.platform ?? 'unknown',
      avgDailyDeliveries: input.avgDailyDeliveries ?? 15,
      zone: input.zoneName ?? 'Unknown',
      basePrice: PREMIUM.BASE,
      maxPrice: PREMIUM.MAX,
    };

    const llmData = await fetchWithRetry<{
      choices?: Array<{ message?: { content?: string } }>;
    }>('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: 'arcee-ai/trinity-large-preview:free:free',
        messages: [
          {
            role: 'system',
            content: `You are an actuarial pricing model for parametric gig-worker income-loss insurance in India. Indian Q-commerce riders earn ₹6,000–₹8,000/week net. Premiums must stay affordable at 0.7–2.8% of weekly income. Given risk factors, recommend a weekly premium between ₹${PREMIUM.BASE} and ₹${PREMIUM.MAX}. Only respond with valid JSON.`,
          },
          {
            role: 'user',
            content: `Calculate the optimal weekly premium for a ${context.platform} delivery partner in ${context.zone}.

Risk factors:
- Historical disruption events (last 4 weeks): ${context.historicalEvents}
- Weather forecast risk (0-1): ${context.forecastRisk.toFixed(2)}
- AQI risk factor (0-1): ${context.aqiRisk.toFixed(2)}
- Social disruption risk (0-1): ${context.socialRisk.toFixed(2)}
- Average daily deliveries: ${context.avgDailyDeliveries}

Pricing constraints:
- Base premium: ₹${context.basePrice}/week
- Maximum premium: ₹${context.maxPrice}/week
- Higher risk = higher premium
- More deliveries = more income to protect = slightly higher premium

Reply JSON only: {"premium": <number>, "reasoning": "<one sentence>"}`,
          },
        ],
      }),
    });

    const content = llmData.choices?.[0]?.message?.content ?? '{}';
    const match = content.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as {
        premium?: number;
        reasoning?: string;
      };
      if (parsed.premium != null && typeof parsed.premium === 'number') {
        const clamped = Math.min(
          PREMIUM.MAX,
          Math.max(PREMIUM.BASE, Math.round(parsed.premium)),
        );
        return {
          premium: clamped,
          reasoning:
            parsed.reasoning ?? 'LLM-assisted risk assessment',
          source: 'llm',
        };
      }
    }
  } catch {
    // Fall through to formula
  }

  return {
    premium: calculateWeeklyPremium(input),
    reasoning: 'Formula-based calculation (LLM fallback)',
    source: 'formula',
  };
}

/**
 * Get social risk factor (0–1) for a zone from news/social events in the last 4 weeks.
 */
export async function getSocialRiskFactor(
  supabase: SupabaseClient,
  zoneLatitude?: number | null,
  zoneLongitude?: number | null,
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - PREMIUM.WEEKS_LOOKBACK * 7);

  const { data } = await supabase
    .from('live_disruption_events')
    .select('id, geofence_polygon')
    .eq('event_type', 'social')
    .gte('created_at', since.toISOString());

  const events = data ?? [];
  if (events.length === 0) return 0;

  const lat = zoneLatitude ?? DEFAULT_ZONE.lat;
  const lng = zoneLongitude ?? DEFAULT_ZONE.lng;

  let zoneMatchCount = 0;
  for (const ev of events) {
    const gf = ev?.geofence_polygon as
      | { lat?: number; lng?: number; radius_km?: number }
      | undefined;
    if (!gf?.lat || !gf?.lng) {
      zoneMatchCount++;
      continue;
    }
    if (isWithinCircle(lat, lng, gf.lat, gf.lng, gf.radius_km ?? 10)) {
      zoneMatchCount++;
    }
  }

  // Normalize: 5+ social events in 4 weeks = factor of 1.0
  return Math.min(1, zoneMatchCount / 5);
}

/**
 * Get historical event count for a zone from the last N weeks.
 */
export async function getHistoricalEventCount(
  supabase: SupabaseClient,
  zoneLatitude?: number | null,
  zoneLongitude?: number | null,
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - PREMIUM.WEEKS_LOOKBACK * 7);

  const { data } = await supabase
    .from('live_disruption_events')
    .select('id, geofence_polygon')
    .gte('created_at', since.toISOString());

  const events = data ?? [];

  // M4 fix: when zone is null, use default zone instead of arbitrary division
  const lat = zoneLatitude ?? DEFAULT_ZONE.lat;
  const lng = zoneLongitude ?? DEFAULT_ZONE.lng;

  let zoneMatchCount = 0;
  for (const ev of events) {
    const gf = ev?.geofence_polygon as
      | { type?: string; lat?: number; lng?: number; radius_km?: number }
      | undefined;
    if (!gf?.lat || !gf?.lng) {
      // No geofence = citywide event, counts for everyone
      zoneMatchCount++;
      continue;
    }
    if (isWithinCircle(lat, lng, gf.lat, gf.lng, gf.radius_km ?? 10)) {
      zoneMatchCount++;
    }
  }
  return zoneMatchCount;
}

/**
 * Fetch forecast and return a 0–1 risk factor for the upcoming period.
 * M2 fix: now includes AQI forecast data alongside weather.
 */
export async function getForecastRiskFactor(
  _supabase: unknown,
  lat: number,
  lng: number,
): Promise<number> {
  const key = process.env.TOMORROW_IO_API_KEY;
  const apiKey = getTomorrowApiKey();
  let weatherRisk = 0;

  if (apiKey) {
    try {
      const data = await fetchWithRetry<{
        timelines?: {
          hourly?: Array<{
            values?: {
              temperature?: number;
              precipitationIntensity?: number;
            };
          }>;
        };
      }>(
        `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&timesteps=1h&apikey=${apiKey}`,
        undefined,
        { cacheTtlMs: EXTERNAL_APIS.CACHE_WEATHER_TTL_MS },
      );
      const hourly = data.timelines?.hourly ?? [];
      if (hourly.length > 0) {
        let triggerHours = 0;
        for (const interval of hourly) {
          const temp = interval.values?.temperature ?? 0;
          const precip = interval.values?.precipitationIntensity ?? 0;
          if (temp >= 43 || precip >= 4) triggerHours++;
        }
        weatherRisk = Math.min(1, triggerHours / hourly.length);
      }
    } catch {
      // Skip
    }
  }

  // M2 fix: also factor in AQI forecast
  let aqiRisk = 0;
  try {
    const aqiData = await fetchWithRetry<{
      hourly?: { us_aqi?: (number | null)[] };
    }>(
      `https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&forecast_days=5`,
      undefined,
      { cacheTtlMs: EXTERNAL_APIS.CACHE_AQI_TTL_MS },
    );
    const aqiValues = (aqiData.hourly?.us_aqi ?? []).filter(
      (v): v is number => v != null,
    );
    if (aqiValues.length > 0) {
      const highAqiHours = aqiValues.filter((v) => v >= 150).length;
      aqiRisk = Math.min(1, highAqiHours / aqiValues.length);
    }
  } catch {
    // Skip
  }

  // Combine weather + AQI risk
  return Math.min(1, weatherRisk * 0.7 + aqiRisk * 0.3);
}

/**
 * Estimates weekly income based on Indian Q-commerce platform data (as of 2024).
 * If avgDailyDeliveries is provided, estimates based on ₹40/order * 7 days.
 * Otherwise, falls back to platform averages.
 */
export function estimateWeeklyIncome(platform?: string, avgDailyDeliveries?: number): number {
  if (avgDailyDeliveries && avgDailyDeliveries > 0) {
    return avgDailyDeliveries * 40 * 7;
  }
  
  const p = (platform || '').toLowerCase();
  if (p.includes('zepto') || p.includes('blinkit') || p.includes('instamart')) {
    return 7500; // High frequency Q-commerce
  }
  if (p.includes('zomato') || p.includes('swiggy')) {
    return 6500; // Standard food delivery
  }
  if (p.includes('dunzo') || p.includes('porter')) {
    return 5500; // Point-to-point / logistics
  }
  return 6000; // National average fallback
}

export interface PremiumEngineInput {
  zoneRiskFactors: {
    heatEvents: number; // last 4 weeks
    rainEvents: number;
    trafficEvents: number;
    socialEvents: number;
  };
  forecastRisk: number; // 0-1
  platform?: string; // e.g., 'zepto', 'blinkit', 'swiggy'
  avgDailyDeliveries?: number; // fallback estimate
  socialStrikeFrequency: number; // 0-1
  riderClaimFrequency: number; // 0-1 (0 = no claims, 1 = many claims)
  previousPremium?: number; // for smoothing
  zoneChanged?: boolean; // if true, apply blended smoothing
}

export interface PremiumTier {
  name: string;
  premium: number;     // The weekly cost
  payoutBase: number;  // The maximum payout per claim
  maxClaims: number;   // Max claims allowed per week
}

export interface PremiumEngineOutput {
  final_premium: number;
  tier_prices: {
    basic: PremiumTier;
    standard: PremiumTier;
    premium: PremiumTier;
  };
  risk_breakdown: {
    zone_risk: number;
    forecast_risk: number;
    income_exposure: number;
    social_risk: number;
    behavior_risk: number;
    seasonal_multiplier: number;
  };
  explanation: string;
}

/**
 * Production-grade dynamic premium engine (Deterministically checks maths + strict unit-economic capping).
 * Incorporates Zone Risk, Forecast Risk, Exposure, Social Risk, and Behavior. 
 */
export function calculateDynamicPremium(input: PremiumEngineInput): PremiumEngineOutput {
  // 1. Zone Risk (35%)
  const heatScore = input.zoneRiskFactors.heatEvents * 1.0;
  const rainScore = input.zoneRiskFactors.rainEvents * 0.8;
  const trafficScore = input.zoneRiskFactors.trafficEvents * 0.6;
  const socialEventsScore = input.zoneRiskFactors.socialEvents * 0.9;
  
  // Normalize zone events (assume 10 total severity sum = 1.0 factor)
  const rawZoneScore = (heatScore + rainScore + trafficScore + socialEventsScore) / 10;
  const zoneRisk = Math.min(1.0, rawZoneScore);
  
  // 2. Forecast Risk (25%)
  const forecastRisk = Math.min(1.0, Math.max(0, input.forecastRisk));
  
  // 3. Income Exposure (15%) -> Industry Data Model
  const effectiveIncome = estimateWeeklyIncome(input.platform, input.avgDailyDeliveries);
  const incomeRisk = Math.min(1.0, effectiveIncome / 10000); 
  
  // 4. Social Risk (10%)
  const socialRisk = Math.min(1.0, Math.max(0, input.socialStrikeFrequency));
  
  // 5. Rider Behavior (15%)
  const behaviorRisk = Math.min(1.0, Math.max(0, input.riderClaimFrequency));
  
  // Weighted Sum 
  const risk_score = 
    (zoneRisk * 0.35) + 
    (forecastRisk * 0.25) + 
    (incomeRisk * 0.15) + 
    (socialRisk * 0.10) + 
    (behaviorRisk * 0.15);
    
  // Seasonal Multipliers
  const month = new Date().getMonth();
  const seasonal_multiplier = SEASONAL_RISK_MULTIPLIER[month] ?? 1.0;
  const final_risk_score = Math.min(1.0, risk_score * seasonal_multiplier);
  
  // Expected Loss Math
  const MAX_CLAIMS_PER_WEEK = 2.0; 
  const expected_claims_per_week = final_risk_score * MAX_CLAIMS_PER_WEEK;
  
  let base_payout = PAYOUT_FALLBACK_INR; 
  let expected_loss = expected_claims_per_week * base_payout;
  
  const margin = 0.25;
  const safety_buffer = 0.15;
  let raw_premium =
    expected_loss * (1 + margin + safety_buffer) * (1 + PREMIUM.RESERVE_LOAD);
  
  // Clamping
  let clamped_premium = Math.max(PREMIUM.BASE, Math.min(PREMIUM.MAX, Math.round(raw_premium)));
  
  // Black Swan Payout Squeeze
  const isBlackSwan = expected_loss >= clamped_premium;
  if (isBlackSwan) {
    const target_expected_loss = clamped_premium * 0.8;
    if (expected_claims_per_week > 0) {
      base_payout = Math.round(target_expected_loss / expected_claims_per_week);
    }
    expected_loss = expected_claims_per_week * base_payout;
    raw_premium =
      expected_loss * (1 + margin + safety_buffer) * (1 + PREMIUM.RESERVE_LOAD);
    clamped_premium = Math.max(PREMIUM.BASE, Math.min(PREMIUM.MAX, Math.round(raw_premium)));
  }

  // Smoothing
  let final_premium = clamped_premium;
  if (input.previousPremium && input.previousPremium > 0) {
    if (input.zoneChanged) {
      const maxJump = input.previousPremium * 0.50; // 50% max jump for zone change
      if (final_premium > input.previousPremium + maxJump) final_premium = input.previousPremium + maxJump;
      if (final_premium < input.previousPremium - maxJump) final_premium = input.previousPremium - maxJump;
    } else {
      const maxJump = input.previousPremium * 0.20; // 20% strict smoothing
      if (final_premium > input.previousPremium + maxJump) final_premium = input.previousPremium + maxJump;
      if (final_premium < input.previousPremium - maxJump) final_premium = input.previousPremium - maxJump;
    }
    final_premium = Math.max(PREMIUM.BASE, Math.min(PREMIUM.MAX, Math.round(final_premium)));
  }
  
  // Explainability String
  let explanation = "Standard premium based on low zone risk.";
  if (forecastRisk > 0.6) explanation = "Elevated premium due to high severe weather forecast this week.";
  else if (zoneRisk > 0.6) explanation = "Premium adjusted for recent high disruptions in your zone.";
  else if (behaviorRisk < 0.2 && input.riderClaimFrequency > 0) explanation = "You received a Safe Rider Discount for low historical claims!";
  else if (input.zoneChanged) explanation = "Premium blended smoothly into your new operating zone.";

  const basicPremium = Math.max(PREMIUM.BASE, Math.round(final_premium * 0.7));
  const maxTierCap = PREMIUM.MAX * 1.5; 
  const premiumPremium = Math.min(maxTierCap, Math.round(final_premium * 1.3));

  // Dynamic Tier Payout Solver
  // Option B: Rider Satisfaction Floor. We ensure payoutBase never drops deeply below the premium 
  // so the policy remains valuable to the rider during Black Swan events, letting the accumulated 
  // margin from 48 non-storm weeks absorb the mathematical loss of this storm week.
  const calculateSafePayout = (tierPremium: number, tierExpectedClaims: number, originalMultiplier: number) => {
    const rawSafePayout = (tierPremium * 0.9) / Math.max(0.01, tierExpectedClaims);
    
    // In severe Black Swan scenarios, we mathematically cannot be strictly profitable without 
    // offending the rider (e.g. payout < premium). So we explicitly absorb the loss and floor the 
    // payout at 1.5x the premium, knowing annualized LTV absorbs the impact.
    if (isBlackSwan) {
       const riderSatisfactionFloor = tierPremium * 1.5; 
       return Math.round(Math.max(riderSatisfactionFloor, Math.min(base_payout * originalMultiplier, rawSafePayout)));
    }
    
    return Math.round(Math.min(base_payout * originalMultiplier, rawSafePayout));
  };
  
  // During a Black Swan, we limit exposure to 1 max claim across tiers, 
  // which allows us to offer the massively subsidized 1.5x PayoutFloor safely.
  const basicClaims = isBlackSwan ? 1 : 1;
  const standardClaims = isBlackSwan ? 1 : 2;
  const premiumClaims = isBlackSwan ? 1 : 3;

  return {
    final_premium: Math.round(final_premium),
    tier_prices: {
      basic: {
        name: "Basic",
        premium: basicPremium,
        payoutBase: calculateSafePayout(basicPremium, final_risk_score * basicClaims, 0.8),
        maxClaims: basicClaims
      },
      standard: {
        name: "Standard",
        premium: Math.round(final_premium),
        payoutBase: calculateSafePayout(final_premium, final_risk_score * standardClaims, 1.0),
        maxClaims: standardClaims
      },
      premium: {
        name: "Premium",
        premium: premiumPremium,
        payoutBase: calculateSafePayout(premiumPremium, final_risk_score * premiumClaims, 1.5),
        maxClaims: premiumClaims
      }
    },
    risk_breakdown: {
      zone_risk: Number(zoneRisk.toFixed(3)),
      forecast_risk: Number(forecastRisk.toFixed(3)),
      income_exposure: Number(incomeRisk.toFixed(3)),
      social_risk: Number(socialRisk.toFixed(3)),
      behavior_risk: Number(behaviorRisk.toFixed(3)),
      seasonal_multiplier: Number(seasonal_multiplier.toFixed(3))
    },
    explanation
  };
}
