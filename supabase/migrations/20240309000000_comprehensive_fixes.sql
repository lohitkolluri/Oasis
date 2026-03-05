-- ============================================================
-- Migration: Comprehensive Fixes
-- Purpose: Fix rider_wallet view, add zone_baseline_stats,
--          add device_fingerprint column, restrict role updates,
--          fix set_app_settings, add cross-profile dedup
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. FIX RIDER_WALLET VIEW
--    Previous view referenced p.profile_id which doesn't exist
--    on parametric_claims. Correct join path: claims → policies.
-- ──────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS rider_wallet;

CREATE OR REPLACE VIEW rider_wallet AS
SELECT
  wp.profile_id                                        AS rider_id,
  COALESCE(SUM(pc.payout_amount_inr), 0)               AS total_earned_inr,
  COUNT(pc.id)                                          AS total_claims,
  COUNT(pc.id) FILTER (WHERE pc.is_flagged = true)      AS flagged_claims,
  MAX(pc.created_at)                                    AS last_payout_at,
  COALESCE(SUM(pc.payout_amount_inr)
    FILTER (WHERE pc.created_at >= date_trunc('week', NOW())), 0) AS this_week_earned_inr,
  COUNT(pc.id)
    FILTER (WHERE pc.created_at >= date_trunc('week', NOW()))     AS this_week_claims
FROM   parametric_claims pc
JOIN   weekly_policies   wp ON wp.id = pc.policy_id
GROUP  BY wp.profile_id;

ALTER VIEW rider_wallet SET (security_invoker = true);
COMMENT ON VIEW rider_wallet IS 'Aggregated payout wallet per rider — fixed join path';

-- ──────────────────────────────────────────────────────────────
-- 2. ZONE_BASELINE_STATS VIEW
--    Rolling 4-week average claim rate per disruption event zone.
--    Used by checkHistoricalBaseline() in fraud/detector.ts.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW zone_baseline_stats AS
WITH event_claims AS (
  SELECT
    lde.id AS event_id,
    lde.event_type,
    lde.geofence_polygon,
    lde.created_at AS event_created_at,
    COUNT(pc.id) AS total_claims
  FROM live_disruption_events lde
  LEFT JOIN parametric_claims pc ON pc.disruption_event_id = lde.id
  GROUP BY lde.id, lde.event_type, lde.geofence_polygon, lde.created_at
),
rolling_avg AS (
  SELECT
    event_id,
    total_claims,
    AVG(total_claims) OVER (
      PARTITION BY event_type
      ORDER BY event_created_at
      RANGE BETWEEN INTERVAL '28 days' PRECEDING AND CURRENT ROW
    ) AS rolling_avg_claims
  FROM event_claims
)
SELECT event_id, total_claims, rolling_avg_claims
FROM rolling_avg;

COMMENT ON VIEW zone_baseline_stats IS 'Rolling 4-week avg claims per event zone for fraud detection';

-- ──────────────────────────────────────────────────────────────
-- 3. DEVICE_FINGERPRINT COLUMN
--    Required by checkDeviceFingerprint() fraud check.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE parametric_claims
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_claims_device_fingerprint
  ON parametric_claims (device_fingerprint, created_at DESC)
  WHERE device_fingerprint IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- 4. RESTRICT ROLE COLUMN UPDATES (SECURITY FIX)
--    Drop the permissive update policy and replace with one
--    that prevents users from changing their own role.
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile (no role change)"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- role must remain unchanged (compare OLD vs NEW)
      role IS NOT DISTINCT FROM (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    )
  );

-- Service role can update anything including role
DROP POLICY IF EXISTS "Service role update profiles" ON profiles;
CREATE POLICY "Service role update profiles"
  ON profiles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 5. FIX set_app_settings() — use ALTER DATABASE for persistence
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_app_settings(
  base_url   TEXT,
  cron_secret TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE format('ALTER DATABASE current_database() SET app.base_url = %L', base_url);
  EXECUTE format('ALTER DATABASE current_database() SET app.cron_secret = %L', cron_secret);
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 6. CROSS-PROFILE DEDUP: prevent same event paying out to
--    profiles sharing the same phone number (F5 velocity check).
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON profiles (phone_number)
  WHERE phone_number IS NOT NULL;

-- Index for claims by disruption event (used for cross-profile check)
CREATE INDEX IF NOT EXISTS idx_claims_disruption_event
  ON parametric_claims (disruption_event_id);

-- ──────────────────────────────────────────────────────────────
-- 7. PAYOUT LEDGER TABLE
--    Tracks simulated instant payouts for demo purposes.
--    Each row = one payout attempt to a rider's wallet/UPI.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES parametric_claims(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_inr NUMERIC(10,2) NOT NULL,
  payout_method TEXT NOT NULL DEFAULT 'upi_instant',
  status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, failed
  mock_upi_ref TEXT,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE payout_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders see own payouts"
  ON payout_ledger FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Service role full access payouts"
  ON payout_ledger FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payout_ledger_claim
  ON payout_ledger (claim_id);

CREATE INDEX IF NOT EXISTS idx_payout_ledger_profile
  ON payout_ledger (profile_id, initiated_at DESC);

COMMENT ON TABLE payout_ledger IS 'Simulated instant payout tracking for demo — models UPI/wallet disbursement';
