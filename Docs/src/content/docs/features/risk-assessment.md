---
title: Risk Assessment & Premium Calculation
description: Dynamic weekly premium based on zone history and forecast
---

Weekly premium is computed per rider from zone history and weather forecast. Strictly weekly - computed every Sunday, covers Monday through Sunday.

## Premium Formula

```
premium = BASE_PREMIUM + min(risk_adjustment, MAX_PREMIUM - BASE_PREMIUM)

risk_adjustment = risk_from_events + risk_from_forecast

risk_from_events  = min(historical_event_count × ₹8, ₹70)
risk_from_forecast = forecast_factor × ₹15
```

**Constants:**

| Constant | Value |
|---|---|
| `BASE_PREMIUM` | ₹79 |
| `MAX_PREMIUM` | ₹149 |
| `RISK_FACTOR_PER_EVENT` | ₹8 |
| `WEEKS_LOOKBACK` | 4 |

**Example calculations:**

| Zone history (4 weeks) | Forecast factor | Premium |
|---|---|---|
| 0 events | 0.0 | ₹79 (base) |
| 2 events | 0.0 | ₹95 |
| 5 events | 0.3 | ₹123 |
| 8+ events | 0.8 | ₹149 (cap) |

---

## Historical Event Count

The premium calculator queries `live_disruption_events` for the past 28 days. For each event, it checks whether the event's geofence overlaps with the rider's zone using `isWithinCircle()`:

```typescript
// lib/ml/premium-calc.ts
export async function getHistoricalEventCount(
  supabase,
  zoneLatitude?: number,
  zoneLongitude?: number
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - WEEKS_LOOKBACK * 7);  // 28 days

  const { data } = await supabase
    .from("live_disruption_events")
    .select("id, geofence_polygon")
    .gte("created_at", since.toISOString());

  let count = 0;
  for (const ev of data) {
    const gf = ev.geofence_polygon;
    if (!gf?.lat || !gf?.lng) {
      count++;  // Citywide event - affects everyone
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

A 0–1 multiplier derived from Tomorrow.io's 5-day hourly forecast for the rider's zone. Any forecast hour that meets a trigger threshold (temperature ≥43°C or precipitation ≥4 mm/h) increments the trigger counter. The ratio of trigger hours to total forecast hours is the `forecastFactor`:

```typescript
// lib/ml/premium-calc.ts
export async function getForecastRiskFactor(
  _supabase,
  lat: number,
  lng: number
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

## Plan Tiers

After the premium is calculated, riders choose from three flat-rate plans. The dynamic calculation informs the recommendation, but riders can select any tier:

| Plan | Weekly Premium | Payout Per Claim | Max Claims/Week |
|---|---|---|---|
| Basic | ₹79 | ₹300 | 2 |
| Standard | ₹99 | ₹400 | 2 |
| Premium | ₹149 | ₹600 | 3 |

The plan chosen is stored as `weekly_policies.plan_id` referencing `plan_packages.id`.

---

## Next-Week Prediction (Admin Dashboard)

The admin analytics panel shows a predicted claims range for the coming week. This is calculated by `lib/ml/next-week-risk.ts`:

**With Tomorrow.io API key (primary path):**
1. Fetch the 5-day hourly forecast for the Bangalore centroid.
2. Count hours above trigger thresholds.
3. Multiply by active policy count and a severity weight.
4. Return a low–high range and a risk level (`low` / `medium` / `high`).

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
}
```

---

## Weekly Renewal

Every Sunday at 17:30 UTC, `/api/cron/weekly-premium` runs:

1. Fetches all active policies where `week_end_date < today`.
2. Sets `is_active = false` for expired policies.
3. For each rider with an expired policy, recalculates the premium for the coming week.
4. Optionally creates a `premium_recommendations` row for display on the rider's dashboard.

Riders must manually re-subscribe each week - automatic renewal would require Stripe Subscriptions.
