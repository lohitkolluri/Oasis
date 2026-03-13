-- ============================================================================
-- PERFORMANCE & SECURITY OPTIMIZATIONS
-- Addresses all Supabase advisor warnings:
--   1. RLS initplan: wrap auth.uid() in (select ...) to prevent per-row re-eval
--   2. Missing index on parametric_claims.disruption_event_id
--   3. SECURITY DEFINER views → SECURITY INVOKER
--   4. Function search_path pinning
--   5. Missing RLS policies for rate_limit_entries and stripe_webhook_events
--   6. Remove redundant indexes
--   7. Simplify over-complex RLS policies
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. FIX RLS POLICIES: wrap auth.uid() in (select auth.uid()) subselect
--    Without subselect, auth.uid() is re-evaluated for EVERY row scanned.
--    With (select auth.uid()), it is evaluated once as an InitPlan constant.
-- ──────────────────────────────────────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = (select auth.uid()));

-- weekly_policies (previously used unnecessary subquery through profiles table)
DROP POLICY IF EXISTS "Users can view own policies" ON weekly_policies;
CREATE POLICY "Users can view own policies" ON weekly_policies
  FOR SELECT USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own policies" ON weekly_policies;
CREATE POLICY "Users can insert own policies" ON weekly_policies
  FOR INSERT WITH CHECK (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own policies" ON weekly_policies;
CREATE POLICY "Users can update own policies" ON weekly_policies
  FOR UPDATE USING (profile_id = (select auth.uid()));

-- parametric_claims (previously used expensive JOIN through weekly_policies+profiles)
DROP POLICY IF EXISTS "Users can view own claims" ON parametric_claims;
CREATE POLICY "Users can view own claims" ON parametric_claims
  FOR SELECT USING (
    policy_id IN (
      SELECT id FROM weekly_policies WHERE profile_id = (select auth.uid())
    )
  );

-- premium_recommendations
DROP POLICY IF EXISTS "Users can view own recommendations" ON premium_recommendations;
CREATE POLICY "Users can view own recommendations" ON premium_recommendations
  FOR SELECT USING (profile_id = (select auth.uid()));

-- payment_transactions
DROP POLICY IF EXISTS "Users can view own payment transactions" ON payment_transactions;
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
  FOR SELECT USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own payment transactions" ON payment_transactions;
CREATE POLICY "Users can insert own payment transactions" ON payment_transactions
  FOR INSERT WITH CHECK (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own payment transactions" ON payment_transactions;
CREATE POLICY "Users can update own payment transactions" ON payment_transactions
  FOR UPDATE USING (profile_id = (select auth.uid()));

-- payout_ledger
DROP POLICY IF EXISTS "Riders see own payouts" ON payout_ledger;
CREATE POLICY "Riders see own payouts" ON payout_ledger
  FOR SELECT USING (profile_id = (select auth.uid()));

-- rider_notifications
DROP POLICY IF EXISTS "Riders see own notifications" ON rider_notifications;
CREATE POLICY "Riders see own notifications" ON rider_notifications
  FOR SELECT USING (profile_id = (select auth.uid()));

-- claim_verifications
DROP POLICY IF EXISTS "Users can update own verifications" ON claim_verifications;
CREATE POLICY "Users can update own verifications" ON claim_verifications
  FOR UPDATE
  USING (profile_id = (select auth.uid()))
  WITH CHECK (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own verifications" ON claim_verifications;
CREATE POLICY "Users can view own verifications" ON claim_verifications
  FOR SELECT USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own verifications" ON claim_verifications;
CREATE POLICY "Users can insert own verifications" ON claim_verifications
  FOR INSERT WITH CHECK (profile_id = (select auth.uid()));

-- rider_delivery_reports
DROP POLICY IF EXISTS "Users can view own reports" ON rider_delivery_reports;
CREATE POLICY "Users can view own reports" ON rider_delivery_reports
  FOR SELECT USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own reports" ON rider_delivery_reports;
CREATE POLICY "Users can insert own reports" ON rider_delivery_reports
  FOR INSERT WITH CHECK (profile_id = (select auth.uid()));

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ADD MISSING INDEX: parametric_claims.disruption_event_id
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_parametric_claims_disruption_event
  ON parametric_claims (disruption_event_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. FIX SECURITY DEFINER VIEWS → SECURITY INVOKER
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW aqi_zone_baselines
  WITH (security_invoker = true)
AS
  SELECT
    (geofence_polygon->>'lat')::float AS zone_lat,
    (geofence_polygon->>'lng')::float AS zone_lng,
    ROUND((geofence_polygon->>'lat')::numeric, 1) AS cluster_lat,
    ROUND((geofence_polygon->>'lng')::numeric, 1) AS cluster_lng,
    COUNT(*) AS trigger_count,
    AVG((raw_api_data->>'current_aqi')::int) AS avg_trigger_aqi,
    AVG((raw_api_data->>'baseline_p75')::int) AS avg_baseline_p75,
    AVG((raw_api_data->>'adaptive_threshold')::int) AS avg_adaptive_threshold,
    AVG((raw_api_data->>'excess_percent')::int) AS avg_excess_pct,
    MAX(created_at) AS last_trigger_at
  FROM live_disruption_events
  WHERE event_type = 'weather'
    AND raw_api_data->>'trigger' = 'severe_aqi'
    AND raw_api_data->>'current_aqi' IS NOT NULL
  GROUP BY zone_lat, zone_lng, cluster_lat, cluster_lng;

CREATE OR REPLACE VIEW zone_baseline_stats
  WITH (security_invoker = true)
AS
  SELECT
    lde.id AS event_id,
    (lde.geofence_polygon->>'lat')::float AS event_lat,
    (lde.geofence_polygon->>'lng')::float AS event_lng,
    COUNT(pc.id) AS total_claims,
    COUNT(pc.id) FILTER (WHERE pc.is_flagged = true) AS flagged_claims,
    AVG(COUNT(pc.id)) OVER (
      PARTITION BY
        ROUND((lde.geofence_polygon->>'lat')::numeric, 1),
        ROUND((lde.geofence_polygon->>'lng')::numeric, 1)
      ORDER BY lde.created_at
      ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING
    ) AS rolling_avg_claims
  FROM live_disruption_events lde
  LEFT JOIN parametric_claims pc ON pc.disruption_event_id = lde.id
  GROUP BY lde.id, lde.geofence_polygon, lde.created_at;

CREATE OR REPLACE VIEW fraud_cluster_signals
  WITH (security_invoker = true)
AS
  SELECT
    disruption_event_id,
    COUNT(id) AS claim_count,
    MIN(created_at) AS first_claim_at,
    MAX(created_at) AS last_claim_at,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS window_seconds,
    COUNT(DISTINCT device_fingerprint) FILTER (WHERE device_fingerprint IS NOT NULL) AS unique_devices,
    COUNT(id) FILTER (WHERE is_flagged = true)::float / NULLIF(COUNT(id), 0)::float AS flag_rate
  FROM parametric_claims pc
  GROUP BY disruption_event_id
  HAVING COUNT(id) >= 5
    AND EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 600;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. FIX FUNCTION search_path — pin to prevent search_path injection
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_stale_policies()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  UPDATE weekly_policies
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true AND week_end_date < CURRENT_DATE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_policy_on_claim_insert()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  UPDATE weekly_policies
  SET is_active = false, updated_at = NOW()
  WHERE id = NEW.policy_id AND week_end_date < CURRENT_DATE AND is_active = true;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_promote_claim_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  IF NEW.gateway_transaction_id IS NOT NULL AND NEW.status = 'triggered' THEN
    NEW.status = 'paid';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_claim(
  p_claim_id uuid,
  p_action text,
  p_reviewed_by text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid action: must be approved or rejected';
  END IF;
  UPDATE parametric_claims
  SET admin_review_status = p_action,
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW(),
      is_flagged = CASE WHEN p_action = 'approved' THEN false ELSE is_flagged END
  WHERE id = p_claim_id;
  INSERT INTO system_logs (event_type, severity, metadata)
  VALUES ('fraud_review',
    CASE WHEN p_action = 'rejected' THEN 'warning' ELSE 'info' END,
    jsonb_build_object('claim_id', p_claim_id, 'action', p_action, 'reviewed_by', p_reviewed_by));
END;
$function$;

CREATE OR REPLACE FUNCTION public.call_adjudicator_cron()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
DECLARE base_url TEXT; secret TEXT;
BEGIN
  SELECT value INTO base_url FROM app_config WHERE key = 'cron_base_url';
  SELECT value INTO secret FROM app_config WHERE key = 'cron_secret';
  IF base_url IS NULL OR trim(base_url) = '' OR secret IS NULL OR trim(secret) = '' OR secret = 'REPLACE_WITH_CRON_SECRET' THEN RETURN; END IF;
  PERFORM net.http_get(
    url := rtrim(base_url, '/') || '/api/cron/adjudicator',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'User-Agent', 'Oasis-SupabaseCron/1.0')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.call_weekly_premium_cron()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
DECLARE base_url TEXT; secret TEXT;
BEGIN
  SELECT value INTO base_url FROM app_config WHERE key = 'cron_base_url';
  SELECT value INTO secret FROM app_config WHERE key = 'cron_secret';
  IF base_url IS NULL OR trim(base_url) = '' OR secret IS NULL OR trim(secret) = '' OR secret = 'REPLACE_WITH_CRON_SECRET' THEN RETURN; END IF;
  PERFORM net.http_post(
    url := rtrim(base_url, '/') || '/api/cron/weekly-premium',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_app_settings(base_url text, cron_secret text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  PERFORM set_config('app.base_url', base_url, false);
  PERFORM set_config('app.cron_secret', cron_secret, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_zone_aqi_baseline(
  p_lat double precision,
  p_lng double precision
)
  RETURNS TABLE(
    zone_lat double precision,
    zone_lng double precision,
    avg_baseline_p75 numeric,
    avg_adaptive_threshold numeric,
    trigger_count bigint,
    last_trigger_at timestamptz,
    chronic_pollution boolean
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.cluster_lat::FLOAT,
    b.cluster_lng::FLOAT,
    ROUND(b.avg_baseline_p75::NUMERIC, 0),
    ROUND(b.avg_adaptive_threshold::NUMERIC, 0),
    b.trigger_count,
    b.last_trigger_at,
    (b.avg_baseline_p75 > 150) AS chronic_pollution
  FROM aqi_zone_baselines b
  WHERE ABS(b.cluster_lat - ROUND(p_lat::NUMERIC, 1)) < 0.15
    AND ABS(b.cluster_lng - ROUND(p_lng::NUMERIC, 1)) < 0.15
  LIMIT 1;
END;
$function$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. ADD RLS POLICIES for tables with RLS enabled but no policies
-- ──────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Service role full access rate_limit" ON rate_limit_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access stripe_webhooks" ON stripe_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. REMOVE REDUNDANT INDEXES
--    These are duplicated by other indexes or unique constraints.
-- ──────────────────────────────────────────────────────────────────────────────

-- Redundant: covered by unique constraint stripe_webhook_events_event_id_key
DROP INDEX IF EXISTS idx_stripe_webhook_events_event_id;

-- Redundant: idx_claim_verifications_claim is prefix of idx_claim_verifications_claim_profile
DROP INDEX IF EXISTS idx_claim_verifications_claim;

-- Redundant: idx_parametric_claims_flagged is subsumed by idx_claims_flagged_created
DROP INDEX IF EXISTS idx_parametric_claims_flagged;

-- Redundant: idx_premium_recommendations_profile is prefix of idx_premium_rec_profile_week
DROP INDEX IF EXISTS idx_premium_recommendations_profile;
