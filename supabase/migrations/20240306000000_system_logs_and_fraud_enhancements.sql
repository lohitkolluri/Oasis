-- ============================================================
-- Migration: System Logs + Fraud Enhancements
-- Purpose  : Observability (system_logs), enhanced fraud signals
--            (device fingerprint, cluster detection columns),
--            and admin claim review workflow.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. SYSTEM LOGS TABLE
--    Records every adjudicator run, API error, and security event
--    so admins can monitor platform health without log scraping.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,            -- 'adjudicator_run', 'adjudicator_demo', 'api_error', 'fraud_alert'
  severity     TEXT NOT NULL DEFAULT 'info',  -- 'info', 'warning', 'error'
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_event_created
  ON system_logs (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_severity_created
  ON system_logs (severity, created_at DESC)
  WHERE severity IN ('warning', 'error');

-- RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access system_logs" ON system_logs;
CREATE POLICY "Service role full access system_logs"
  ON system_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 2. FRAUD SIGNAL ENHANCEMENTS
--    Add columns to parametric_claims for advanced fraud signals:
--    - device_fingerprint: hash of device attributes
--    - fraud_signals: JSONB bag of all fraud checks performed
--    - admin_review_status: for manual review workflow
--    - reviewed_by / reviewed_at: audit trail
-- ──────────────────────────────────────────────────────────────
ALTER TABLE parametric_claims
  ADD COLUMN IF NOT EXISTS device_fingerprint  TEXT,
  ADD COLUMN IF NOT EXISTS fraud_signals       JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_review_status TEXT CHECK (admin_review_status IN ('pending', 'approved', 'rejected')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by         TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at         TIMESTAMPTZ;

-- Index for admin review queue
CREATE INDEX IF NOT EXISTS idx_claims_review_status
  ON parametric_claims (admin_review_status, created_at DESC)
  WHERE admin_review_status IS NOT NULL;

-- Index for device fingerprint fraud detection
CREATE INDEX IF NOT EXISTS idx_claims_device_fingerprint
  ON parametric_claims (device_fingerprint, created_at DESC)
  WHERE device_fingerprint IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- 3. CLUSTER ANOMALY DETECTION VIEW
--    Surfaces events where ≥80% of claims in a zone within
--    10 minutes — a signal of coordinated/synthetic fraud.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW fraud_cluster_signals AS
SELECT
  pc.disruption_event_id,
  COUNT(pc.id)                                         AS claim_count,
  MIN(pc.created_at)                                   AS first_claim_at,
  MAX(pc.created_at)                                   AS last_claim_at,
  EXTRACT(EPOCH FROM (MAX(pc.created_at) - MIN(pc.created_at))) AS window_seconds,
  COUNT(DISTINCT pc.device_fingerprint)
    FILTER (WHERE pc.device_fingerprint IS NOT NULL)   AS unique_devices,
  (COUNT(pc.id) FILTER (WHERE pc.is_flagged = true))::FLOAT
    / NULLIF(COUNT(pc.id), 0)                          AS flag_rate
FROM parametric_claims pc
GROUP BY pc.disruption_event_id
HAVING
  COUNT(pc.id) >= 5
  AND EXTRACT(EPOCH FROM (MAX(pc.created_at) - MIN(pc.created_at))) < 600;

COMMENT ON VIEW fraud_cluster_signals IS
  'Events with ≥5 claims in <10 min — potential coordinated fraud';

-- ──────────────────────────────────────────────────────────────
-- 4. HISTORICAL BASELINE VIEW
--    Per-zone weekly claim average for anomaly detection.
--    Flag if this week's count is 3× the rolling 4-week average.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW zone_baseline_stats AS
SELECT
  lde.id                                                      AS event_id,
  (lde.geofence_polygon->>'lat')::FLOAT                       AS event_lat,
  (lde.geofence_polygon->>'lng')::FLOAT                       AS event_lng,
  COUNT(pc.id)                                                AS total_claims,
  COUNT(pc.id) FILTER (WHERE pc.is_flagged = true)            AS flagged_claims,
  AVG(COUNT(pc.id)) OVER (
    PARTITION BY
      ROUND((lde.geofence_polygon->>'lat')::NUMERIC, 1),
      ROUND((lde.geofence_polygon->>'lng')::NUMERIC, 1)
    ORDER BY lde.created_at
    ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING
  )                                                           AS rolling_avg_claims
FROM live_disruption_events lde
LEFT JOIN parametric_claims pc ON pc.disruption_event_id = lde.id
GROUP BY lde.id, lde.geofence_polygon, lde.created_at;

-- ──────────────────────────────────────────────────────────────
-- 5. ADMIN REVIEW FUNCTION
--    Approve or reject a flagged claim and log the action.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_review_claim(
  p_claim_id      UUID,
  p_action        TEXT,   -- 'approved' or 'rejected'
  p_reviewed_by   TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid action: must be approved or rejected';
  END IF;

  UPDATE parametric_claims SET
    admin_review_status = p_action,
    reviewed_by         = p_reviewed_by,
    reviewed_at         = NOW(),
    -- If approved, clear the flag so it counts as a normal paid claim
    is_flagged          = CASE WHEN p_action = 'approved' THEN false ELSE is_flagged END
  WHERE id = p_claim_id;

  INSERT INTO system_logs (event_type, severity, metadata)
  VALUES (
    'fraud_review',
    CASE WHEN p_action = 'rejected' THEN 'warning' ELSE 'info' END,
    jsonb_build_object(
      'claim_id',     p_claim_id,
      'action',       p_action,
      'reviewed_by',  p_reviewed_by
    )
  );
END;
$$;
