-- ============================================================================
-- CRITICAL FIXES: data integrity, RLS, and performance
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. UNIQUE INDEX: prevent duplicate pending policies per rider/week
--    The existing index uq_one_active_policy_per_rider_week only covers
--    is_active=true, leaving pending policies open to race conditions.
-- ──────────────────────────────────────────────────────────────────────────────

-- Before enforcing uniqueness, clean up any historical duplicates that may
-- already exist due to prior race conditions. Keep the most recent row.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY profile_id, week_start_date
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM weekly_policies
  WHERE payment_status = 'pending'
)
DELETE FROM weekly_policies wp
USING ranked r
WHERE wp.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_pending_policy_per_rider_week
  ON weekly_policies (profile_id, week_start_date)
  WHERE payment_status = 'pending';

COMMENT ON INDEX uq_one_pending_policy_per_rider_week IS
  'Prevents duplicate pending checkouts for the same rider in the same week';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. INDEX: payment_transactions on razorpay_order_id / payment_id
--    Audit lookups and idempotency reconciliation.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_payment_transactions_razorpay_order
  ON payment_transactions (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_razorpay_payment
  ON payment_transactions (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. INDEX: profiles.role for admin role enforcement lookups
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role)
  WHERE role IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. INDEX: claim_verifications on (profile_id, verified_at)
--     Used by checkImpossibleTravel for velocity checks.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_claim_verifications_profile_verified
  ON claim_verifications (profile_id, verified_at DESC)
  WHERE verified_at IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. INDEX: rider_delivery_reports for verification_status sweep
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rider_reports_verification_status
  ON rider_delivery_reports (verification_status, created_at DESC)
  WHERE verification_status IN ('pending', 'failed');

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. UNIQUE INDEX: one claim per policy per disruption event
--    Belt-and-suspenders on top of application-level duplicate checks.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_per_policy_event
  ON parametric_claims (policy_id, disruption_event_id);

COMMENT ON INDEX uq_claim_per_policy_event IS
  'One claim per policy per disruption event — prevents duplicate payouts';

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. RLS: riders can see holds that affect them (READ ONLY)
--    automated_holds has service_role ALL but no authenticated policy.
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Riders see own holds" ON automated_holds;
CREATE POLICY "Riders see own holds"
  ON automated_holds FOR SELECT
  TO authenticated
  USING (profile_id = (select auth.uid()));

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. RLS: enable RLS on external_api_backoff (currently disabled)
--    Only service_role should access it via the SECURITY DEFINER RPCs.
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'external_api_backoff'
  ) THEN
    ALTER TABLE external_api_backoff ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Service role full access external_api_backoff" ON external_api_backoff;
    CREATE POLICY "Service role full access external_api_backoff"
      ON external_api_backoff FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. INDEX: payout_ledger on status
--    Admin dashboards filter and aggregate by payout status.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_payout_ledger_status
  ON payout_ledger (status);

-- ──────────────────────────────────────────────────────────────────────────────
-- 10. Ensure payment_status has a sensible default in case an older migration
--     did not set it.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE weekly_policies
  ALTER COLUMN payment_status SET DEFAULT 'pending';

-- ──────────────────────────────────────────────────────────────────────────────
-- 11. CHECK constraint: rider_delivery_reports.verification_status
--     Prevent arbitrary strings; align with the enum values used by the app.
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  BEGIN
    ALTER TABLE rider_delivery_reports
      ADD CONSTRAINT rider_delivery_reports_verification_status_check
      CHECK (verification_status IS NULL OR verification_status IN ('pending', 'verified', 'failed'));
  EXCEPTION
    WHEN duplicate_object THEN
      -- Constraint already exists in this environment.
      NULL;
  END;
END $$;
