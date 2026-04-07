-- Performance-focused schema updates for admin analytics and weekly premium runtime.

-- Keep runtime payloads consistent with app upserts (some environments lacked this).
ALTER TABLE premium_recommendations
  ADD COLUMN IF NOT EXISTS risk_factors JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Hot predicates used by financial/admin dashboards.
CREATE INDEX IF NOT EXISTS idx_weekly_policies_payment_week_earned
  ON weekly_policies (payment_status, week_start_date DESC)
  WHERE payment_status IN ('paid', 'demo');

CREATE INDEX IF NOT EXISTS idx_parametric_claims_flagged_pending_created
  ON parametric_claims (created_at DESC)
  WHERE is_flagged = true AND admin_review_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_platform_present
  ON profiles (id)
  WHERE platform IS NOT NULL;

-- Shared metrics rollup used by /api/admin/analytics and /api/admin/insights.
-- SECURITY DEFINER is deliberate so admin read paths can avoid expensive client-side fanout.
CREATE OR REPLACE FUNCTION admin_window_metrics(
  p_since TIMESTAMPTZ,
  p_since_week DATE,
  p_since24 TIMESTAMPTZ
)
RETURNS TABLE (
  total_claims BIGINT,
  total_payout NUMERIC,
  flagged_claims BIGINT,
  total_events BIGINT,
  total_premium NUMERIC,
  claims_24h BIGINT,
  fraud_pending BIGINT,
  reports_24h BIGINT,
  severe_events_24h BIGINT,
  top_trigger TEXT,
  top_trigger_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reports24 BIGINT := 0;
  v_since_week_ist DATE;
BEGIN
  -- Normalize p_since_week to IST week Monday for consistent bucketing.
  -- This protects against callers passing a date derived from UTC instants.
  v_since_week_ist := public.ist_week_monday_ymd((p_since_week::timestamptz));

  IF to_regclass('public.rider_delivery_reports') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.rider_delivery_reports WHERE created_at >= $1'
      INTO v_reports24
      USING p_since24;
  END IF;

  RETURN QUERY
  WITH claim_window AS (
    SELECT
      COUNT(*)::BIGINT AS total_claims,
      COALESCE(SUM(payout_amount_inr), 0) AS total_payout,
      COUNT(*) FILTER (WHERE is_flagged = true)::BIGINT AS flagged_claims,
      COUNT(*) FILTER (WHERE created_at >= p_since24)::BIGINT AS claims_24h,
      COUNT(*) FILTER (WHERE is_flagged = true AND admin_review_status IS NULL)::BIGINT AS fraud_pending
    FROM parametric_claims
    WHERE created_at >= p_since
  ),
  event_window AS (
    SELECT COUNT(*)::BIGINT AS total_events
    FROM live_disruption_events
    WHERE created_at >= p_since
  ),
  event_24h AS (
    SELECT
      COUNT(*) FILTER (WHERE severity_score >= 8)::BIGINT AS severe_events_24h
    FROM live_disruption_events
    WHERE created_at >= p_since24
  ),
  top_trigger_24h AS (
    SELECT event_type, COUNT(*)::BIGINT AS cnt
    FROM live_disruption_events
    WHERE created_at >= p_since24
    GROUP BY event_type
    ORDER BY cnt DESC, event_type
    LIMIT 1
  ),
  premium_window AS (
    SELECT COALESCE(SUM(weekly_premium_inr), 0) AS total_premium
    FROM weekly_policies
    WHERE week_start_date >= v_since_week_ist
      AND payment_status IN ('paid', 'demo')
  )
  SELECT
    cw.total_claims,
    cw.total_payout,
    cw.flagged_claims,
    ew.total_events,
    pw.total_premium,
    cw.claims_24h,
    cw.fraud_pending,
    v_reports24,
    e24.severe_events_24h,
    COALESCE(tt.event_type::text, 'none'),
    COALESCE(tt.cnt, 0)
  FROM claim_window cw
  CROSS JOIN event_window ew
  CROSS JOIN event_24h e24
  CROSS JOIN premium_window pw
  LEFT JOIN top_trigger_24h tt ON TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_window_metrics(TIMESTAMPTZ, DATE, TIMESTAMPTZ)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION admin_plan_financials()
RETURNS TABLE (
  plan_id UUID,
  active_policies BIGINT,
  modeled_premium_inr NUMERIC,
  payouts_inr NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wp.plan_id,
    COUNT(*)::BIGINT AS active_policies,
    COALESCE(SUM(wp.weekly_premium_inr), 0) AS modeled_premium_inr,
    COALESCE(SUM(pc.payout_amount_inr), 0) AS payouts_inr
  FROM weekly_policies wp
  LEFT JOIN parametric_claims pc ON pc.policy_id = wp.id
  WHERE wp.is_active = true
    AND wp.plan_id IS NOT NULL
    AND wp.payment_status IN ('paid', 'demo')
  GROUP BY wp.plan_id;
$$;

GRANT EXECUTE ON FUNCTION admin_plan_financials()
  TO authenticated, service_role;
