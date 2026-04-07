-- ============================================================
-- Migration: Autonomous Database Improvements
-- Purpose : Make Oasis fully self-operating with minimal human
--           intervention. Covers auto-triggers, smart indexes,
--           wallet view, admin policies, and pg_cron scheduling.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. UPDATED_AT AUTO-TRIGGER
--    Replaces every manual `updated_at: new Date().toISOString()`
--    scattered through application code.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- weekly_policies
DROP TRIGGER IF EXISTS trg_weekly_policies_updated_at ON weekly_policies;
CREATE TRIGGER trg_weekly_policies_updated_at
  BEFORE UPDATE ON weekly_policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- parametric_claims
DROP TRIGGER IF EXISTS trg_parametric_claims_updated_at ON parametric_claims;
CREATE TRIGGER trg_parametric_claims_updated_at
  BEFORE UPDATE ON parametric_claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- plan_packages
DROP TRIGGER IF EXISTS trg_plan_packages_updated_at ON plan_packages;
CREATE TRIGGER trg_plan_packages_updated_at
  BEFORE UPDATE ON plan_packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 2. AUTO-PROFILE CREATION
--    Creates a minimal profile row the instant a rider signs up
--    so downstream queries never have a missing profile.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_profile_on_signup ON auth.users;
CREATE TRIGGER trg_create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- ──────────────────────────────────────────────────────────────
-- 3. AUTO-EXPIRE WEEKLY POLICIES
--    A DB function + trigger deactivates a policy the moment a
--    new claim would be inserted for it after its end date —
--    and a scheduled job sweeps any remaining ones nightly.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION expire_stale_policies()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE weekly_policies
  SET    is_active   = false,
         updated_at  = NOW()
  WHERE  is_active   = true
    AND  week_end_date < CURRENT_DATE;
END;
$$;

-- Trigger version: fires whenever a parametric_claim is inserted
-- so the policy status is always up-to-date during adjudicator runs.
CREATE OR REPLACE FUNCTION expire_policy_on_claim_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE weekly_policies
  SET    is_active  = false,
         updated_at = NOW()
  WHERE  id        = NEW.policy_id
    AND  week_end_date < CURRENT_DATE
    AND  is_active  = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expire_policy_on_claim ON parametric_claims;
CREATE TRIGGER trg_expire_policy_on_claim
  AFTER INSERT ON parametric_claims
  FOR EACH ROW EXECUTE FUNCTION expire_policy_on_claim_insert();

-- ──────────────────────────────────────────────────────────────
-- 4. PERFORMANCE INDEXES
--    Target the exact query shapes used by the adjudicator,
--    fraud detector, wallet view, and platform-status checks.
-- ──────────────────────────────────────────────────────────────

-- Adjudicator: fetch active policies in the current week
CREATE INDEX IF NOT EXISTS idx_weekly_policies_active_week
  ON weekly_policies (is_active, week_start_date, week_end_date)
  WHERE is_active = true;

-- Adjudicator: look up rider zone coordinates quickly
CREATE INDEX IF NOT EXISTS idx_profiles_zone_coords
  ON profiles (zone_latitude, zone_longitude)
  WHERE zone_latitude IS NOT NULL AND zone_longitude IS NOT NULL;

-- Fraud detector (duplicate check): the two equality columns together
CREATE INDEX IF NOT EXISTS idx_claims_policy_event
  ON parametric_claims (policy_id, disruption_event_id);

-- Fraud detector + weekly-cap: claims for a policy within a time window
CREATE INDEX IF NOT EXISTS idx_claims_policy_created
  ON parametric_claims (policy_id, created_at DESC);

-- Platform-status + RiskRadar: recent high-severity events
CREATE INDEX IF NOT EXISTS idx_disruption_events_severity_created
  ON live_disruption_events (severity_score, created_at DESC);

-- Claim verification lookup
CREATE INDEX IF NOT EXISTS idx_claim_verifications_claim_profile
  ON claim_verifications (claim_id, profile_id);

-- Premium recommendations lookup for policy page
CREATE INDEX IF NOT EXISTS idx_premium_rec_profile_week
  ON premium_recommendations (profile_id, week_start_date DESC);

-- Rider delivery reports: zone-based spatial filter
CREATE INDEX IF NOT EXISTS idx_reports_created_zone
  ON rider_delivery_reports (created_at DESC, zone_lat, zone_lng)
  WHERE zone_lat IS NOT NULL AND zone_lng IS NOT NULL;

-- Flagged claims index (admin fraud queue)
CREATE INDEX IF NOT EXISTS idx_claims_flagged_created
  ON parametric_claims (is_flagged, created_at DESC)
  WHERE is_flagged = true;

-- ──────────────────────────────────────────────────────────────
-- 5. RIDER WALLET VIEW
--    Aggregates total payouts + claim counts per rider.
--    Replaces the client-side JS reduce() that ran on every
--    dashboard load.  Backed by the new composite index above.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW rider_wallet AS
SELECT
  p.profile_id,
  wp.profile_id                                        AS rider_id,
  COALESCE(SUM(p.payout_amount_inr), 0)                AS total_earned_inr,
  COUNT(p.id)                                          AS total_claims,
  COUNT(p.id) FILTER (WHERE p.is_flagged = true)       AS flagged_claims,
  MAX(p.created_at)                                    AS last_payout_at,
  COALESCE(SUM(p.payout_amount_inr)
    FILTER (
      WHERE p.created_at >= (
        ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - (((EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))::int + 6) % 7)))::text
        || 'T00:00:00+05:30'
      )::timestamptz
    ), 0) AS this_week_earned_inr,
  COUNT(p.id)
    FILTER (
      WHERE p.created_at >= (
        ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - (((EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))::int + 6) % 7)))::text
        || 'T00:00:00+05:30'
      )::timestamptz
    )     AS this_week_claims
FROM   parametric_claims p
JOIN   weekly_policies    wp ON wp.id = p.policy_id
GROUP  BY p.profile_id, wp.profile_id;

-- RLS: riders see only their own wallet row
ALTER VIEW rider_wallet SET (security_invoker = true);

COMMENT ON VIEW rider_wallet IS 'Aggregated payout wallet per rider — replaces client-side reduce()';

-- ──────────────────────────────────────────────────────────────
-- 6. ADMIN RLS POLICIES
--    Let service_role (admin API routes) read all policies,
--    claims, profiles, and events without bypassing RLS.
--    Existing policies already allow service_role full access
--    on claims and events; add read policies for profiles and
--    weekly_policies for the admin dashboard.
-- ──────────────────────────────────────────────────────────────

-- Profiles: admin read
DROP POLICY IF EXISTS "Service role read profiles" ON profiles;
CREATE POLICY "Service role read profiles"
  ON profiles FOR SELECT
  TO service_role
  USING (true);

-- Weekly policies: admin read + update
DROP POLICY IF EXISTS "Service role read policies" ON weekly_policies;
CREATE POLICY "Service role read policies"
  ON weekly_policies FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role update policies" ON weekly_policies;
CREATE POLICY "Service role update policies"
  ON weekly_policies FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role insert policies" ON weekly_policies;
CREATE POLICY "Service role insert policies"
  ON weekly_policies FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Premium recommendations: service role write
DROP POLICY IF EXISTS "Service role full access recommendations" ON premium_recommendations;
CREATE POLICY "Service role full access recommendations"
  ON premium_recommendations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Rider delivery reports: service role read (admin dashboard)
DROP POLICY IF EXISTS "Service role read reports" ON rider_delivery_reports;
CREATE POLICY "Service role read reports"
  ON rider_delivery_reports FOR SELECT
  TO service_role
  USING (true);

-- Claim verifications: service role full access
DROP POLICY IF EXISTS "Service role full access verifications" ON claim_verifications;
CREATE POLICY "Service role full access verifications"
  ON claim_verifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 7. PG_CRON AUTONOMOUS SCHEDULING
--    Requires pg_cron extension (enabled by default in Supabase).
--    Two jobs:
--      a) Nightly policy expiry sweep  (01:00 IST = 19:30 UTC)
--      b) Weekly premium recomputation (Sunday 23:00 IST = 17:30 UTC)
--         — calls the Next.js cron endpoint via pg_net so the
--           full ML pipeline (Tomorrow.io + historical) runs.
--
--    pg_net is also enabled by default in Supabase and lets
--    Postgres make outbound HTTP calls.
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove stale cron jobs before (re-)registering
SELECT cron.unschedule(jobid)
FROM   cron.job
WHERE  jobname IN (
  'oasis_expire_policies',
  'oasis_weekly_premium_cron'
);

-- a) Nightly: expire all stale policies (01:00 IST = 19:30 UTC prev day)
SELECT cron.schedule(
  'oasis_expire_policies',
  '30 19 * * *',
  $$ SELECT expire_stale_policies(); $$
);

-- b) Weekly: trigger premium recomputation every Sunday 23:00 IST (17:30 UTC)
--    The CRON_SECRET env var must be set in Supabase Vault / project settings.
--    pg_net.http_post returns immediately; the response is logged in net._http_response.
SELECT cron.schedule(
  'oasis_weekly_premium_cron',
  '30 17 * * 0',
  $$
    SELECT net.http_post(
      url     := current_setting('app.base_url') || '/api/cron/weekly-premium',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ──────────────────────────────────────────────────────────────
-- 8. HELPER: set_app_settings
--    Call once after migration to configure base_url + cron_secret
--    so pg_cron HTTP jobs know where to POST.
--    Example:
--      SELECT set_app_settings(
--        'https://your-app.vercel.app',
--        'your-cron-secret-here'
--      );
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_app_settings(
  base_url   TEXT,
  cron_secret TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.base_url',    base_url,    false);
  PERFORM set_config('app.cron_secret', cron_secret, false);
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 9. CLAIM STATUS CONSISTENCY
--    Ensure that a claim inserted with status 'triggered' that
--    already has a gateway_transaction_id is immediately
--    promoted to 'paid'.  Prevents stale 'triggered' rows if
--    the adjudicator inserts with status='paid' correctly but
--    a race or replay leaves the wrong status.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_promote_claim_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.gateway_transaction_id IS NOT NULL AND NEW.status = 'triggered' THEN
    NEW.status = 'paid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_promote_claim_status ON parametric_claims;
CREATE TRIGGER trg_auto_promote_claim_status
  BEFORE INSERT OR UPDATE ON parametric_claims
  FOR EACH ROW EXECUTE FUNCTION auto_promote_claim_status();

-- ──────────────────────────────────────────────────────────────
-- 10. PREVENT DUPLICATE ACTIVE POLICIES PER RIDER PER WEEK
--     A partial unique constraint so the DB itself prevents two
--     active policies for the same rider in the same week,
--     independently of the application layer.
-- ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_policy_per_rider_week
  ON weekly_policies (profile_id, week_start_date)
  WHERE is_active = true;

COMMENT ON INDEX uq_one_active_policy_per_rider_week
  IS 'Prevents two active policies for the same rider in the same week';
