# Database Reference — Oasis

> **Engine:** PostgreSQL 15 (Supabase managed)
> **Auth:** Row-Level Security (RLS) enforced on all tables
> **Migrations:** `supabase/migrations/` — applied in version order

---

## Migration History

| Migration File | Purpose |
|----------------|---------|
| `20240304000001_create_profiles.sql` | Rider profile table |
| `20240304000002_create_weekly_policies.sql` | Weekly insurance policy records |
| `20240304000003_create_live_disruption_events.sql` | Parametric trigger events |
| `20240304000004_create_parametric_claims.sql` | Claim payouts |
| `20240304000005_add_fraud_flags.sql` | Fraud detection columns |
| `20240304000006_add_zone_coords.sql` | Zone geolocation on profiles |
| `20240304000007_premium_recommendations.sql` | ML-based premium suggestions |
| `20240304000008_rider_delivery_reports.sql` | Rider self-reports |
| `20240304000009_claim_verifications.sql` | GPS-based claim verification |
| `20240304100000_plan_packages.sql` | Plan tiers (Basic/Standard/Premium) |
| `20240305000000_autonomous_db_improvements.sql` | Triggers, indexes, views, pg_cron |
| `20240306000000_system_logs_and_fraud_enhancements.sql` | Observability + fraud signals |
| `20240306000001_aqi_baseline_tracking.sql` | AQI zone baseline views |

---

## Tables

### `profiles`

Stores rider identity and zone location. Auto-created on user signup via `trg_create_profile_on_signup`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, FK → `auth.users` | Matches Supabase Auth UID |
| `full_name` | `text` | | Rider display name |
| `email` | `text` | | Contact email |
| `phone` | `text` | | Contact phone |
| `platform` | `platform_type` enum | | `zepto`, `blinkit`, `swiggy`, `other` |
| `zone_latitude` | `numeric(10,7)` | | Rider's delivery zone latitude |
| `zone_longitude` | `numeric(10,7)` | | Rider's delivery zone longitude |
| `updated_at` | `timestamptz` | auto-updated | Last modified (via trigger) |

**RLS Policies:**
- `Users can view own profile` — SELECT where `id = auth.uid()`
- `Users can update own profile` — UPDATE where `id = auth.uid()`
- `Service role read profiles` — Service role reads all (admin)

**Key Indexes:**
```sql
idx_profiles_zone_coords ON profiles (zone_latitude, zone_longitude)
  WHERE zone_latitude IS NOT NULL AND zone_longitude IS NOT NULL
```

---

### `plan_packages`

The three insurance plan tiers available for subscription.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `slug` | `text` UNIQUE | `basic`, `standard`, `premium` |
| `name` | `text` | Display name |
| `description` | `text` | Plan description |
| `weekly_premium_inr` | `numeric(10,2)` | Weekly cost in INR |
| `payout_per_claim_inr` | `numeric(10,2)` | Per-claim payout amount |
| `max_claims_per_week` | `int` | Cap on weekly claims |
| `is_active` | `boolean` | Whether plan is selectable |
| `sort_order` | `int` | Display order |

**Seeded Data:**

| Slug | Premium/week | Payout/claim | Max Claims |
|------|-------------|--------------|-----------|
| `basic` | ₹79 | ₹300 | 2 |
| `standard` | ₹99 | ₹400 | 2 |
| `premium` | ₹149 | ₹600 | 3 |

---

### `weekly_policies`

One row per active insurance policy. A rider can only have one active policy per week (enforced by partial unique index).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK → `profiles` |
| `plan_id` | `uuid` | FK → `plan_packages` |
| `premium_paid_inr` | `numeric(10,2)` | Amount paid |
| `week_start_date` | `date` | Policy start |
| `week_end_date` | `date` | Policy end |
| `is_active` | `boolean` | Live policy flag |
| `payment_reference` | `text` | Gateway transaction ID |
| `updated_at` | `timestamptz` | Auto-updated |

**Constraints:**
```sql
-- Prevent two active policies in the same week for same rider
UNIQUE INDEX uq_one_active_policy_per_rider_week
  ON weekly_policies (profile_id, week_start_date)
  WHERE is_active = true
```

**Auto-expiry:** DB trigger `trg_expire_policy_on_claim` and pg_cron job `oasis_expire_policies` deactivate policies past their end date.

---

### `live_disruption_events`

Every detected parametric trigger event. Created by the adjudicator.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `event_type` | `disruption_event_type` enum | `weather`, `traffic`, `social` |
| `event_subtype` | `text` | e.g. `extreme_wind`, `severe_aqi`, `flash_flood` |
| `severity_score` | `int` | 1–10 scale |
| `geofence_polygon` | `jsonb` | `{type: "circle", lat, lng, radius_km}` |
| `raw_api_data` | `jsonb` | Full API response snapshot |
| `is_active` | `boolean` | Whether event is still ongoing |
| `created_at` | `timestamptz` | Event detection time |

**AQI raw_api_data structure** (for `severe_aqi` events):
```json
{
  "trigger": "severe_aqi",
  "current_aqi": 380,
  "adaptive_threshold": 336,
  "baseline_p75": 240,
  "baseline_mean": 195,
  "historical_days": 30,
  "excess_percent": 58,
  "source": "openmeteo_adaptive"
}
```

---

### `parametric_claims`

One row per triggered payout. Created automatically by the adjudicator.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `policy_id` | `uuid` | FK → `weekly_policies` |
| `disruption_event_id` | `uuid` | FK → `live_disruption_events` |
| `payout_amount_inr` | `numeric(10,2)` | Amount credited to rider |
| `status` | `claim_status` enum | `triggered`, `paid`, `rejected` |
| `is_flagged` | `boolean` | Fraud flag |
| `device_fingerprint` | `text` | Device hash for fraud detection |
| `fraud_signals` | `jsonb` | All fraud check results |
| `admin_review_status` | `text` | `pending`, `approved`, `rejected` |
| `reviewed_by` | `text` | Admin email who reviewed |
| `reviewed_at` | `timestamptz` | Review timestamp |
| `gateway_transaction_id` | `text` | Payment gateway reference |
| `created_at` | `timestamptz` | Claim creation time |
| `updated_at` | `timestamptz` | Auto-updated |

**Status auto-promotion:** If `gateway_transaction_id` is set, trigger auto-promotes status from `triggered` → `paid`.

---

### `claim_verifications`

GPS-based location verification submitted by rider after a claim is triggered.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `claim_id` | `uuid` | FK → `parametric_claims` |
| `profile_id` | `uuid` | FK → `profiles` |
| `verified_lat` | `numeric(10,7)` | GPS latitude at verification time |
| `verified_lng` | `numeric(10,7)` | GPS longitude at verification time |
| `verified_at` | `timestamptz` | When GPS was captured |
| `status` | `verification_status` enum | `inside_geofence`, `outside_geofence` |
| `declaration_confirmed` | `boolean` | Rider confirmed "I cannot deliver" |
| `proof_url` | `text` | Optional photo from Storage |
| `declaration_at` | `timestamptz` | Declaration timestamp |

**Constraint:** `UNIQUE(claim_id, profile_id)` — one verification per claim per rider.

---

### `rider_delivery_reports`

Voluntary self-reports from riders when unable to deliver. Used to enrich platform status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK → `profiles` |
| `zone_lat` | `numeric(10,7)` | Rider's zone latitude |
| `zone_lng` | `numeric(10,7)` | Rider's zone longitude |
| `report_type` | `rider_report_type` enum | `cant_deliver` |
| `message` | `text` | Optional text description |
| `photo_url` | `text` | Optional photo |
| `created_at` | `timestamptz` | Report time |

---

### `premium_recommendations`

ML-generated weekly premium suggestions per rider. Updated by the weekly cron job.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK → `profiles` |
| `recommended_plan` | `text` | `basic`, `standard`, or `premium` |
| `suggested_premium_inr` | `numeric(10,2)` | Suggested weekly premium |
| `risk_score` | `numeric` | 0–1 risk score |
| `reasoning` | `text` | Human-readable explanation |
| `week_start_date` | `date` | Week this rec applies to |

**Constraint:** `UNIQUE(profile_id, week_start_date)` — one rec per rider per week.

---

### `system_logs`

Immutable audit log for adjudicator runs, API errors, fraud alerts, and admin actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `event_type` | `text` | `adjudicator_run`, `adjudicator_demo`, `api_error`, `fraud_review`, `fraud_alert` |
| `severity` | `text` | `info`, `warning`, `error` |
| `metadata` | `jsonb` | Arbitrary event context |
| `created_at` | `timestamptz` | Event time |

**Access:** Service role only (admin API routes). Riders cannot read logs.

---

## Views

### `rider_wallet`

Aggregated payout totals per rider. Replaces client-side JavaScript reduce operations.

```sql
SELECT
  wp.profile_id AS rider_id,
  COALESCE(SUM(p.payout_amount_inr), 0) AS total_earned_inr,
  COUNT(p.id) AS total_claims,
  COUNT(p.id) FILTER (WHERE p.is_flagged) AS flagged_claims,
  MAX(p.created_at) AS last_payout_at,
  -- This week only
  COALESCE(SUM(p.payout_amount_inr)
    FILTER (WHERE p.created_at >= date_trunc('week', NOW())), 0) AS this_week_earned_inr,
  COUNT(p.id)
    FILTER (WHERE p.created_at >= date_trunc('week', NOW())) AS this_week_claims
FROM parametric_claims p
JOIN weekly_policies wp ON wp.id = p.policy_id
GROUP BY wp.profile_id
```

**Security:** `security_invoker = true` — RLS of underlying tables is enforced.

---

### `fraud_cluster_signals`

Surfaces potential coordinated fraud: events with ≥5 claims in under 10 minutes.

```sql
SELECT
  disruption_event_id,
  COUNT(id) AS claim_count,
  MIN(created_at) AS first_claim_at,
  MAX(created_at) AS last_claim_at,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS window_seconds,
  COUNT(DISTINCT device_fingerprint) AS unique_devices,
  (COUNT(id) FILTER (WHERE is_flagged))::FLOAT / NULLIF(COUNT(id), 0) AS flag_rate
FROM parametric_claims
GROUP BY disruption_event_id
HAVING COUNT(id) >= 5
  AND EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 600
```

---

### `zone_baseline_stats`

Per-zone rolling average claim counts for historical anomaly detection.

---

### `aqi_zone_baselines`

Aggregates AQI trigger history per zone cluster. Shows average current AQI, P75 baseline, adaptive threshold, and excess percentage at trigger time.

---

## Database Functions

### `expire_stale_policies()`

Bulk-deactivates all weekly policies past their `week_end_date`. Called by pg_cron nightly.

```sql
UPDATE weekly_policies
SET is_active = false, updated_at = NOW()
WHERE is_active = true AND week_end_date < CURRENT_DATE;
```

### `admin_review_claim(p_claim_id, p_action, p_reviewed_by)`

Approves or rejects a flagged claim and logs the action to `system_logs`.

```sql
-- Usage
SELECT admin_review_claim(
  'claim-uuid-here',
  'approved',          -- or 'rejected'
  'admin@example.com'
);
```

### `set_app_settings(base_url, cron_secret)`

Configures pg_cron HTTP job target. Run once after deployment.

```sql
SELECT set_app_settings(
  'https://your-app.vercel.app',
  'your-cron-secret'
);
```

### `get_zone_aqi_baseline(p_lat, p_lng)`

Returns AQI baseline stats for a geographic zone.

```sql
SELECT * FROM get_zone_aqi_baseline(28.6139, 77.2090); -- Delhi
-- Returns: zone_lat, zone_lng, avg_baseline_p75, avg_adaptive_threshold,
--          trigger_count, last_trigger_at, chronic_pollution
```

---

## Indexes Summary

All indexes follow Supabase best practices: partial indexes on boolean filters, composite indexes for multi-column query patterns, covering indexes where useful.

| Index | Table | Purpose |
|-------|-------|---------|
| `idx_profiles_zone_coords` | profiles | Adjudicator zone discovery |
| `idx_weekly_policies_active_week` | weekly_policies | Active policy queries |
| `uq_one_active_policy_per_rider_week` | weekly_policies | Duplicate prevention |
| `idx_weekly_policies_plan` | weekly_policies | Plan join performance |
| `idx_claims_policy_event` | parametric_claims | Duplicate claim check |
| `idx_claims_policy_created` | parametric_claims | Weekly cap check |
| `idx_claims_flagged_created` | parametric_claims | Admin fraud queue |
| `idx_claims_review_status` | parametric_claims | Review queue filter |
| `idx_claims_device_fingerprint` | parametric_claims | Device fraud check |
| `idx_disruption_events_severity_created` | live_disruption_events | Risk Radar query |
| `idx_disruption_events_aqi_trigger` | live_disruption_events | AQI event lookup |
| `idx_system_logs_event_created` | system_logs | Health dashboard |
| `idx_system_logs_severity_created` | system_logs | Error monitoring |
| `idx_claim_verifications_claim_profile` | claim_verifications | Verification lookup |
| `idx_premium_rec_profile_week` | premium_recommendations | Policy page query |
| `idx_rider_delivery_reports_zone` | rider_delivery_reports | Spatial zone filter |
| `idx_reports_created_zone` | rider_delivery_reports | Platform status |

---

## RLS Policy Matrix

| Table | anon | authenticated (own) | service_role |
|-------|------|---------------------|--------------|
| `profiles` | — | SELECT, UPDATE | SELECT |
| `weekly_policies` | — | SELECT, INSERT | SELECT, INSERT, UPDATE |
| `plan_packages` | — | SELECT (active) | ALL |
| `live_disruption_events` | SELECT | SELECT | ALL |
| `parametric_claims` | — | SELECT (own) | ALL |
| `claim_verifications` | — | SELECT, INSERT (own) | ALL |
| `rider_delivery_reports` | — | SELECT, INSERT (own) | SELECT |
| `premium_recommendations` | — | SELECT (own) | ALL |
| `system_logs` | — | — | ALL |

> **RLS Best Practice:** All policies use `(SELECT auth.uid())` (with SELECT wrapper) rather than bare `auth.uid()` to ensure the function is called once per query, not once per row. This follows the [Supabase RLS performance guide](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations).

---

## pg_cron Scheduled Jobs

| Job Name | Schedule | Action |
|----------|----------|--------|
| `oasis_expire_policies` | Daily 19:30 UTC (01:00 IST) | `SELECT expire_stale_policies()` |
| `oasis_weekly_premium_cron` | Sunday 17:30 UTC (23:00 IST) | HTTP POST to `/api/cron/weekly-premium` |

> **Note:** The weekly premium cron uses `pg_net` to make an outbound HTTP call to the Next.js endpoint, which runs the full ML pipeline (Tomorrow.io forecast + risk scoring).
