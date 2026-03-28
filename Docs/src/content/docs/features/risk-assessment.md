---
title: Risk Assessment & Premium Calculation
description: Dynamic weekly premium with seasonal adjustments, social risk, and claim frequency
---

Weekly premium is computed per rider from zone history, weather forecast, seasonal patterns, social disruption risk, and individual claim frequency. Strictly weekly — computed every Sunday, covers Monday through Sunday.

## Premium Formula

```
premium = BASE_PREMIUM + min(risk_adjustment, MAX_PREMIUM - BASE_PREMIUM)

risk_adjustment = (risk_from_events + risk_from_forecast + risk_from_social)
                  × seasonal_multiplier
                  × claim_frequency_multiplier
```

**Constants:**

| Constant | Value |
|---|---|
| `BASE_PREMIUM` | ₹49 |
| `MAX_PREMIUM` | ₹199 |
| `RISK_FACTOR_PER_EVENT` | ₹12 |
| `FORECAST_WEIGHT` | ₹20 |
| `WEEKS_LOOKBACK` | 4 |

---

## Seasonal Risk Multiplier

India's weather follows strong seasonal patterns that directly affect delivery disruption frequency. The premium calculator applies a monthly multiplier:

| Months | Multiplier | Reason |
|---|---|---|
| Jun – Sep (Monsoon) | 1.40× | Peak rain, flooding, waterlogging |
| Oct | 1.15× | Post-monsoon cyclones, residual rain |
| Nov | 1.15× | Cyclone season (Bay of Bengal) |
| Dec – Feb (Winter) | 0.85× | Mild weather, low disruption risk |
| Mar (Transition) | 1.00× | Baseline |
| Apr – May (Pre-monsoon) | 1.25× | Extreme heat waves across north India |

```typescript
const SEASONAL_RISK_MULTIPLIER: Record<number, number> = {
  0: 0.85,  // Jan
  1: 0.85,  // Feb
  2: 1.0,   // Mar
  3: 1.25,  // Apr
  4: 1.25,  // May
  5: 1.4,   // Jun
  6: 1.4,   // Jul
  7: 1.4,   // Aug
  8: 1.4,   // Sep
  9: 1.15,  // Oct
  10: 1.15, // Nov
  11: 0.85, // Dec
};
```

---

## Social Risk Factor

Social disruption (strikes, curfews, lockdowns) is tracked separately from weather. The `getSocialRiskFactor` function queries `live_disruption_events` of type `social` within a rider's zone over the past 4 weeks:

```
socialRiskFactor = min(1.0, socialEventCount / 5)
```

| Social events (4 weeks) | Risk factor |
|---|---|
| 0 | 0.0 |
| 1 | 0.2 |
| 3 | 0.6 |
| 5+ | 1.0 (cap) |

This ensures riders in protest-prone zones pay a fair premium reflecting their actual risk.

---

## Claim Frequency Multiplier

Riders with frequent recent claims represent higher risk. The premium calculator counts claims from the past 4 weeks:

```
claimFreqMultiplier = 1.0 + min(0.2, claimCountLast4Weeks × 0.04)
```

| Claims (4 weeks) | Multiplier |
|---|---|
| 0 | 1.00× |
| 2 | 1.08× |
| 5 | 1.20× (cap) |
| 10 | 1.20× (cap) |

The 0.2 cap ensures that even high-claim riders don't see premiums spike beyond 20% above base due to this factor alone.

---

## Historical Event Count

The premium calculator queries `live_disruption_events` for the past 28 days. For each event, it checks whether the event's geofence overlaps with the rider's zone using `isWithinCircle()`:

```typescript
export async function getHistoricalEventCount(
  supabase,
  zoneLatitude?: number,
  zoneLongitude?: number
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - WEEKS_LOOKBACK * 7);

  const { data } = await supabase
    .from("live_disruption_events")
    .select("id, geofence_polygon")
    .gte("created_at", since.toISOString());

  let count = 0;
  for (const ev of data) {
    const gf = ev.geofence_polygon;
    if (!gf?.lat || !gf?.lng) {
      count++;
      continue;
    }
    if (isWithinCircle(zoneLatitude, zoneLongitude, gf.lat, gf.lng, gf.radius_km ?? 10)) {
      count++;
    }
  }
  return count;
}
```

Zones without explicit geofence data (e.g., citywide curfews) count toward every rider's risk score.

---

## Forecast Risk Factor

A 0–1 multiplier derived from Tomorrow.io's 5-day hourly forecast for the rider's zone. Any forecast hour meeting a trigger threshold (temperature ≥ 43°C or precipitation ≥ 4 mm/h) increments the trigger counter:

```typescript
export async function getForecastRiskFactor(
  _supabase, lat: number, lng: number
): Promise<number> {
  const hourly = await fetchTomorrowForecast(lat, lng);
  let triggerHours = 0;
  for (const interval of hourly) {
    if (interval.temperature >= 43 || interval.precipitationIntensity >= 4) {
      triggerHours++;
    }
  }
  return Math.min(1, triggerHours / hourly.length);
}
```

---

## Example Calculations

| Zone history (4w) | Forecast | Social events | Claims (4w) | Month | Premium |
|---|---|---|---|---|---|
| 0 events | 0.0 | 0 | 0 | Nov | ₹49 (base) |
| 3 events | 0.2 | 1 | 2 | Mar | ₹89 |
| 5 events | 0.5 | 3 | 4 | Jul (monsoon) | ₹175 |
| 8+ events | 0.8 | 5 | 10 | Aug (monsoon) | ₹199 (cap) |

---

## Technical reserve load

Premiums apply `PREMIUM.RESERVE_LOAD` (currently **2%**) after core expected-loss math in both the legacy weekly formula and the dynamic engine. This funds **technical reserve** narrative (IBNR-style lag, tail correlation) and aligns with Policy §10. It is **not** a separate rider-visible line item — it is baked into the quoted weekly premium before clamping to `PREMIUM.BASE`–`PREMIUM.MAX`.

**Dynamic engine:** `raw_premium = expected_loss × (1 + margin + safety_buffer) × (1 + RESERVE_LOAD)`.

**Reinsurance** (quota share, catastrophe XL) is described at contract level in Policy §10; it is not modeled in application code in the current release.

---

## Plan Tiers

After the premium is calculated, riders choose from three flat-rate plans. The dynamic calculation informs the recommendation, but riders can select any tier:

| Plan | Weekly Premium | Payout Per Claim | Max Claims/Week |
|---|---|---|---|
| Basic | ₹49 | ₹300 | 1 |
| Standard | ₹99 | ₹700 | 2 |
| Premium | ₹199 | ₹1,500 | 3 |

The plan chosen is stored as `weekly_policies.plan_id` referencing `plan_packages.id`.

---

## Cron: Weekly Premium Recommendations

Every Sunday at 17:30 UTC, `/api/cron/weekly-premium` runs:

1. Fetches all active policies where `week_end_date < today`.
2. Sets `is_active = false` for expired policies.
3. For each rider with an expired policy, recalculates the premium:
   - Fetches historical events, forecast risk, and social risk per zone (cached per zone).
   - Queries the rider's claim count over the past 4 weeks.
   - Applies seasonal multiplier for the current month.
   - Passes all factors to `calculatePremiumWithLlm` for final recommendation.
4. Stores the result in `premium_recommendations` with `risk_factors` JSONB:
   ```json
   {
     "historical_events": 3,
     "forecast_risk": 0.25,
     "social_risk": 0.4,
     "claim_count_4w": 2,
     "seasonal_multiplier": 1.4
   }
   ```

Riders must manually re-subscribe each week — automatic renewal would require a recurring billing integration (for example Razorpay Subscriptions) on top of the current weekly Checkout flow.

---

## Next-Week Prediction (Admin Dashboard)

The admin analytics panel shows a predicted claims range for the coming week, calculated by `lib/ml/next-week-risk.ts`:

**With Tomorrow.io API key (primary path):**
1. Discover **all active rider zones** from `weekly_policies` + `profiles`.
2. Deduplicate zones within ~11 km of each other.
3. For each zone in parallel:
   - Fetch 5-day hourly weather forecast (Tomorrow.io) — count hours above heat/rain thresholds.
   - Fetch 5-day AQI forecast (Open-Meteo) — count hours above AQI 150.
4. Aggregate trigger hours and risk types across all zones.
5. Factor in active policy count and severity weight.
6. Return a low–high range, risk level, AQI risk note, and zones checked count.

**Historical fallback (no API key):**
1. Query `parametric_claims` for the past 21 days.
2. Calculate the weekly average.
3. Apply a linear trend (week 1 vs. week 3 claim rate).
4. Return `avg ± 2` as the range.

```typescript
interface NextWeekPrediction {
  expectedClaimsRange: string;   // e.g. "8–14"
  riskLevel: "low" | "medium" | "high";
  source: "forecast" | "historical";
  details?: string;
  aqiRisk?: string;              // e.g. "12h of poor AQI across 3 zones"
  zonesChecked?: number;         // number of zones analyzed
}
```
