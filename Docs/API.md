# API Reference — Oasis

All API routes are Next.js Route Handlers (`app/api/...`). Authentication uses Supabase JWT tokens passed via the `Authorization: Bearer <token>` header or via the Supabase cookie session.

---

## Authentication

All rider endpoints require an active Supabase session. Admin endpoints additionally check that the authenticated user's email appears in the `ADMIN_EMAILS` environment variable.

**Auth flow:**
```
Cookie session (browser) → Supabase SSR client → verify session → extract user
```

---

## Cron Endpoints

These endpoints are called by Vercel Cron (or pg_cron) and protected by a bearer secret.

### `POST /api/cron/adjudicator`

Runs the parametric adjudicator: detects disruptions, processes claims.

**Auth:** `Authorization: Bearer {CRON_SECRET}`

**Response:**
```json
{
  "ok": true,
  "zones_processed": 3,
  "events_detected": 2,
  "claims_created": 14,
  "duration_ms": 4210
}
```

**Trigger logic:**
1. Discover active rider zones from `profiles`
2. Cluster zones into ~10 km grid cells
3. For each cluster: check weather (Tomorrow.io), AQI (Open-Meteo adaptive), news (NewsData + LLM)
4. Run fraud detection on each candidate claim
5. Insert `live_disruption_events` and `parametric_claims`
6. Log run to `system_logs`

---

### `POST /api/cron/weekly-premium`

Recalculates next-week premium recommendations for all active riders.

**Auth:** `Authorization: Bearer {CRON_SECRET}`

**Response:**
```json
{
  "ok": true,
  "processed": 47,
  "duration_ms": 8320
}
```

---

## Admin Endpoints

### `GET /api/admin/insights`

Returns aggregate platform statistics for the admin overview dashboard.

**Auth:** Admin session required

**Response:**
```json
{
  "total_riders": 234,
  "active_policies": 89,
  "total_claims_this_week": 12,
  "total_payout_this_week_inr": 4800,
  "flagged_claims_pending": 3,
  "active_disruptions": 1
}
```

---

### `POST /api/admin/run-adjudicator`

Manually triggers the adjudicator (same logic as cron endpoint).

**Auth:** Admin session required

**Response:**
```json
{
  "ok": true,
  "message": "Adjudicator run complete",
  "claims_created": 0
}
```

---

### `POST /api/admin/demo-trigger`

Injects a synthetic disruption event for testing/demo. Does not call external APIs.

**Auth:** Admin session required

**Request:**
```json
{
  "eventSubtype": "extreme_wind",
  "lat": 12.9716,
  "lng": 77.5946,
  "radiusKm": 15,
  "severity": 8
}
```

**Supported `eventSubtype` values:**
- `extreme_wind` — Weather: wind ≥ 60 km/h
- `flash_flood` — Weather: heavy rainfall
- `severe_aqi` — Weather: AQI emergency
- `traffic_lockdown` — Traffic: major blockage
- `civic_unrest` — Social: protest/curfew

**Response:**
```json
{
  "ok": true,
  "event_id": "uuid",
  "claims_triggered": 5,
  "message": "Demo event injected successfully"
}
```

---

### `POST /api/admin/review-claim`

Approves or rejects a flagged claim. Calls the `admin_review_claim` DB function.

**Auth:** Admin session required

**Request:**
```json
{
  "claimId": "uuid",
  "action": "approved"
}
```

**`action` values:** `approved` | `rejected`

**Response:**
```json
{
  "ok": true,
  "message": "Claim approved successfully"
}
```

---

### `GET /api/admin/system-health`

Returns platform health status: last adjudicator run, API connectivity, error counts.

**Auth:** Admin session required

**Response:**
```json
{
  "last_run": {
    "timestamp": "2026-03-04T10:30:00Z",
    "claims_created": 0,
    "zones_processed": 3,
    "duration_ms": 3200
  },
  "errors_24h": 0,
  "api_status": {
    "tomorrow_io": "ok",
    "open_meteo": "ok",
    "newsdata_io": "ok"
  },
  "recent_logs": [...]
}
```

---

### `GET /api/admin/analytics`

Returns time-series data for analytics charts.

**Auth:** Admin session required

**Query params:**
- `days` — number of days to look back (default: `30`)

**Response:**
```json
{
  "claims_timeline": [
    { "date": "2026-03-01", "claims": 5, "payout_inr": 2000 }
  ],
  "loss_ratio_weekly": [
    { "week": "2026-W09", "premiums_inr": 9900, "payouts_inr": 4800, "loss_ratio": 0.48 }
  ],
  "trigger_breakdown": [
    { "type": "weather", "count": 8 },
    { "type": "social", "count": 2 }
  ],
  "severity_distribution": [
    { "severity": 7, "count": 3 },
    { "severity": 8, "count": 5 }
  ]
}
```

---

### `POST /api/admin/update-policy`

Updates an admin-controlled field on a weekly policy (e.g., force-activate or deactivate).

**Auth:** Admin session required

**Request:**
```json
{
  "policyId": "uuid",
  "updates": {
    "is_active": false
  }
}
```

---

## Rider Endpoints

### `GET /api/rider/insight`

Returns a personalized risk insight and payout recommendation for the authenticated rider.

**Auth:** Rider session required

**Response:**
```json
{
  "risk_score": 0.72,
  "recommended_plan": "premium",
  "reasoning": "Your zone (Koramangala, Bangalore) had 3 disruption events last week. Upgrade for higher coverage.",
  "week_start_date": "2026-03-03"
}
```

---

### `POST /api/rider/report-delivery`

Submits a delivery impact report (rider cannot deliver due to conditions).

**Auth:** Rider session required

**Request:**
```json
{
  "zone_lat": 12.9716,
  "zone_lng": 77.5946,
  "message": "Heavy rain, roads flooded",
  "photo_url": null
}
```

**Response:**
```json
{
  "ok": true,
  "report_id": "uuid"
}
```

---

## Claims Endpoints

### `POST /api/claims/verify-location`

Captures GPS location to verify rider was in the affected zone at claim time.

**Auth:** Rider session required

**Request:**
```json
{
  "claim_id": "uuid",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "declaration_confirmed": true
}
```

**Response:**
```json
{
  "ok": true,
  "status": "inside_geofence",
  "verification_id": "uuid"
}
```

**Logic:**
1. Fetch the disruption event's geofence from the claim's `disruption_event_id`
2. Calculate Haversine distance between rider GPS and event center
3. Compare to event's `radius_km`
4. Insert `claim_verifications` row with computed status

---

## Platform Endpoints

### `GET /api/platform/status`

Returns current platform status: active disruptions + recent rider delivery reports.

**Auth:** Public (no auth required)

**Response:**
```json
{
  "active_disruptions": [
    {
      "id": "uuid",
      "event_type": "weather",
      "event_subtype": "severe_aqi",
      "severity_score": 8,
      "geofence_polygon": { "lat": 28.6139, "lng": 77.2090, "radius_km": 15 },
      "created_at": "2026-03-04T08:00:00Z"
    }
  ],
  "recent_reports_count": 12,
  "status": "disrupted"
}
```

---

## Routing Endpoints

### `GET /api/routing/check`

Checks OSRM route viability between two points (used by Risk Radar).

**Auth:** Rider session required

**Query params:**
- `from_lat`, `from_lng` — Origin coordinates
- `to_lat`, `to_lng` — Destination coordinates

**Response:**
```json
{
  "routable": true,
  "distance_km": 4.2,
  "duration_minutes": 18,
  "blocked": false
}
```

---

## Payment Endpoints

### `POST /api/payments/create-order`

Creates a payment order for policy subscription.

**Auth:** Rider session required

**Request:**
```json
{
  "plan_slug": "standard",
  "week_start_date": "2026-03-03"
}
```

**Response (demo mode):**
```json
{
  "order_id": "demo_order_1709468400000",
  "amount_inr": 99,
  "demo_mode": true
}
```

**Response (Razorpay live):**
```json
{
  "order_id": "order_xxx",
  "amount_paise": 9900,
  "currency": "INR",
  "key_id": "rzp_live_xxx"
}
```

---

### `POST /api/payments/verify`

Verifies Razorpay payment signature and activates the policy.

**Auth:** Rider session required

**Request:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_hash",
  "plan_slug": "standard",
  "week_start_date": "2026-03-03"
}
```

**Response:**
```json
{
  "ok": true,
  "policy_id": "uuid",
  "week_start_date": "2026-03-03",
  "week_end_date": "2026-03-09"
}
```

---

## Error Responses

All endpoints return consistent error shapes:

```json
{
  "error": "Descriptive error message",
  "code": "UNAUTHORIZED | NOT_FOUND | VALIDATION_ERROR | INTERNAL_ERROR"
}
```

**HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Invalid request body or parameters |
| `401` | Not authenticated |
| `403` | Authenticated but not authorized (e.g., non-admin on admin route) |
| `404` | Resource not found |
| `409` | Conflict (e.g., duplicate active policy) |
| `500` | Internal server error |

---

## Rate Limiting

There is no built-in rate limiting at the API layer. In production, configure Vercel Edge middleware or an upstream WAF for rate limiting on:
- `/api/claims/verify-location` — max 10/hour per user
- `/api/rider/report-delivery` — max 5/hour per user
- `/api/payments/create-order` — max 3/hour per user
