# Realtime disruption triggers

How the adjudicator gets disruption events: **webhooks** (realtime) for providers that support push, and **cron every 15 minutes** for the rest.

---

## 1. Webhook (realtime)

For providers that can **push** events (e.g. Tomorrow.io Alerts), call:

**`POST /api/webhooks/disruption`**

**Auth:** `Authorization: Bearer <WEBHOOK_SECRET>` or `X-Webhook-Secret: <WEBHOOK_SECRET>`. If `WEBHOOK_SECRET` is not set, `CRON_SECRET` is used.

**Body (JSON):**

| Field        | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `type`      | string | Yes      | `weather` \| `traffic` \| `social` |
| `subtype`   | string | No       | e.g. `extreme_heat`, `heavy_rain` (default `webhook`) |
| `severity`  | number | No       | 0–10 (default 7) |
| `lat`       | number | Yes      | Center latitude |
| `lng`       | number | Yes      | Center longitude |
| `radius_km` | number | No       | Geofence radius in km (default 15) |
| `raw`       | object | No       | Arbitrary payload stored in `raw_api_data` |

**Example (Tomorrow.io-style):**

```json
{
  "type": "weather",
  "subtype": "extreme_heat",
  "severity": 8,
  "lat": 12.97,
  "lng": 77.59,
  "radius_km": 15,
  "raw": { "source": "tomorrow_alert", "eventId": "abc123" }
}
```

**Response:** `200 OK` with `{ ok: true, eventId, claimsCreated, payoutsInitiated }`.

Configure your provider to POST to `https://<your-app>/api/webhooks/disruption` with the bearer token. One trigger per request; the handler runs fraud checks and creates claims/payouts immediately.

---

## 2. Cron every 15 minutes (fallback)

For **weather**, **AQI**, and **news** APIs that do **not** support webhooks, the adjudicator runs on a schedule and **polls** those APIs:

- **GitHub Actions:** workflow runs every 15 min (`*/15 * * * *`), calls `GET /api/cron/adjudicator` with `CRON_SECRET`.
- **Supabase pg_cron:** if you use the Supabase cron integration, apply the migration that sets `oasis_adjudicator_cron` to `*/15 * * * *` (see `supabase/migrations/20240314000000_adjudicator_every_15min.sql`).

So:

- **Realtime:** use the webhook for any provider that can push (e.g. Tomorrow.io Alerts).
- **Every 15 min:** cron covers Tomorrow.io (if not wired to webhook), WAQI/Open-Meteo, and NewsData.io.

---

## 3. Env vars

| Variable        | Purpose |
|-----------------|---------|
| `WEBHOOK_SECRET` | Secret for `POST /api/webhooks/disruption`. If unset, `CRON_SECRET` is used. |
| `CRON_SECRET`    | Used by cron jobs and, when `WEBHOOK_SECRET` is unset, by the webhook. |

Use a dedicated `WEBHOOK_SECRET` for provider webhooks if you want to keep cron auth separate.
