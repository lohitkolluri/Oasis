---
id: api
title: API Reference
sidebar_position: 8
---

# API Reference

All API routes live under `app/api/`. Authentication is enforced via Supabase session cookies (SSR) or `CRON_SECRET` Bearer token for cron endpoints.

---

## Authentication

Most endpoints require an active Supabase session. Pass the session cookie automatically via the browser client, or use the server client in SSR contexts.

Admin endpoints additionally check that the authenticated user's email is in `ADMIN_EMAILS` or their `profile.role === 'admin'`.

---

## Cron Endpoints

### `GET /api/cron/adjudicator`

Runs the parametric adjudicator. Triggered hourly by Vercel cron.

**Auth:** `Authorization: Bearer <CRON_SECRET>`

**Response:**
```json
{
  "ok": true,
  "triggered_at": "2024-03-05T12:00:00.000Z",
  "candidates_found": 2,
  "claims_created": 14,
  "zones_checked": 3,
  "message": "Adjudicator run complete"
}
```

**Error (503):**
```json
{
  "ok": false,
  "error": "Supabase not configured",
  "triggered_at": "2024-03-05T12:00:00.000Z"
}
```

---

### `GET /api/cron/weekly-premium`

Renews weekly policies every Sunday at 17:30 UTC. Deactivates expired policies and calculates premiums for the coming week.

**Auth:** `Authorization: Bearer <CRON_SECRET>`

**Response:**
```json
{
  "ok": true,
  "renewed": 42,
  "skipped": 3
}
```

---

## Admin Endpoints

All admin endpoints return `401` if the caller is not an admin.

### `POST /api/admin/run-adjudicator`

Manually trigger the adjudicator on demand (same as the cron version).

**Body:** `{}` (empty)

**Response:** Same shape as `/api/cron/adjudicator`.

---

### `POST /api/admin/demo-trigger`

Inject a synthetic disruption event for demo purposes.

**Body:**
```json
{
  "eventSubtype": "extreme_heat",
  "lat": 12.9716,
  "lng": 77.5946,
  "radiusKm": 15,
  "severity": 8
}
```

**`eventSubtype` values:** `extreme_heat` | `heavy_rain` | `severe_aqi` | `traffic_gridlock` | `zone_curfew`

---

### `GET /api/admin/analytics`

Returns aggregated platform analytics for the admin dashboard.

**Response:**
```json
{
  "totalRiders": 120,
  "activePolicies": 87,
  "totalClaims": 342,
  "totalPayoutInr": 136800,
  "flaggedClaims": 4,
  "weeklyGrowth": 12.5
}
```

---

### `GET /api/admin/insights`

Returns AI-generated platform insights (next-week risk prediction, top disruption zones).

---

### `GET /api/admin/system-health`

Returns current system status: database connection, API key availability, last adjudicator run.

**Response:**
```json
{
  "database": "ok",
  "tomorrowio": "configured",
  "newsdata": "configured",
  "openrouter": "configured",
  "lastRun": "2024-03-05T11:00:00.000Z",
  "lastRunResult": {
    "claims_created": 8,
    "zones_checked": 2
  }
}
```

---

### `PATCH /api/admin/review-claim`

Manually flag or unflag a claim.

**Body:**
```json
{
  "claimId": "uuid",
  "isFlagged": true,
  "reason": "Manual review: suspected GPS spoof"
}
```

---

### `PATCH /api/admin/update-policy`

Update policy status (e.g., deactivate).

**Body:**
```json
{
  "policyId": "uuid",
  "isActive": false
}
```

---

### `PATCH /api/admin/update-role`

Promote or demote a rider's role.

**Body:**
```json
{
  "profileId": "uuid",
  "role": "admin"
}
```

---

## Payment Endpoints

### `POST /api/payments/create-checkout`

Creates a Stripe Checkout Session for weekly premium payment.

**Body:**
```json
{
  "planId": "uuid",
  "weekStart": "2024-03-04",
  "weekEnd": "2024-03-10"
}
```

**Response (redirect):**
```json
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_...",
  "policyId": "uuid"
}
```

Requires `STRIPE_SECRET_KEY` (use `sk_test_...` for test mode). Redirects to Stripe Checkout.

---

### `POST /api/payments/webhook`

Stripe webhook for `checkout.session.completed`. Configure in Stripe Dashboard → Developers → Webhooks. URL: `https://your-app.com/api/payments/webhook`

---

## Rider Endpoints

### `GET /api/rider/insight`

Returns an AI-generated personalized risk insight for the authenticated rider.

**Response:**
```json
{
  "insight": "Your zone has seen 3 disruptions in the past 4 weeks. Rain risk is elevated next week.",
  "riskLevel": "medium",
  "recommendedPlan": "standard"
}
```

---

### `POST /api/rider/report-delivery`

Submits a delivery impact report with optional GPS coordinates and file upload.

**Body (multipart/form-data):**
```
latitude: 12.9716
longitude: 77.5946
note: "Heavy rain blocked my zone from 2pm–5pm"
file: <optional image>
```

---

## Claims Endpoints

### `POST /api/claims/verify-location`

Records a GPS verification for an open claim. Used by the `ClaimVerificationPrompt` component.

**Body:**
```json
{
  "claimId": "uuid",
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

The endpoint checks whether the coordinates fall within the claim's disruption event geofence and records the result as `within_geofence` or `outside_geofence`.

---

## Platform Endpoints

### `GET /api/platform/status`

Returns the current operational status of each delivery platform.

**Response:**
```json
{
  "zepto": { "status": "operational", "activeRiders": 45 },
  "blinkit": { "status": "degraded", "activeRiders": 22 }
}
```

---

## Routing Endpoints

### `POST /api/routing/check`

Proxy to the OSRM routing API. Returns route details between two coordinates.

**Body:**
```json
{
  "origin": { "lat": 12.9716, "lng": 77.5946 },
  "destination": { "lat": 12.9352, "lng": 77.6245 }
}
```

---

## Auth Endpoints

### `POST /api/auth/signout`

Signs out the current session by clearing Supabase auth cookies.

**Response:** `200 OK` with redirect to `/login`.
