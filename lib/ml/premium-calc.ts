/**
 * Dynamic weekly premium calculation using LLM-assisted risk assessment.
 *
 * Improvements (M1-M5):
 *  - LLM-based risk scoring when OpenRouter is available
 *  - Factors in AQI and social disruptions (not just weather) (M2)
 *  - Proper fallback when zone is null (M4)
 *  - Platform/delivery volume elasticity (M5)
 *  - Forecast risk includes AQI data
 */

import { DEFAULT_ZONE, EXTERNAL_APIS, PREMIUM } from '@/lib/config/constants';
import { isWithinCircle } from '@/lib/utils/geo';
import { fetchWithRetry } from '@/lib/utils/retry';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Month-based seasonal risk multiplier for Indian weather patterns.
 * Based on IMD historical data for metros.
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
 * Calculate weekly premium with multi-factor risk model.
 * Includes seasonal adjustment (Indian weather patterns) and claim frequency factor.
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
    (PREMIUM.BASE + totalRisk) * volumeMultiplier * seasonalMultiplier * claimFreqMultiplier;
  return Math.min(PREMIUM.MAX, Math.max(PREMIUM.BASE, Math.round(rawPremium)));
}

/**
 * LLM-assisted premium calculation.
 * Sends risk context to the LLM for an intelligent pricing recommendation,
 * then clamps the result within the allowed ₹79-₹149 range.
 */
export async function calculatePremiumWithLlm(
  input: PremiumInput,
): Promise<{ premium: number; reasoning: string; source: 'llm' | 'formula' }> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

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
    const match = content.match(/\{[\s\S]*\}/);
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
  let weatherRisk = 0;

  if (key) {
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
        `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&timesteps=1h&apikey=${key}`,
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
