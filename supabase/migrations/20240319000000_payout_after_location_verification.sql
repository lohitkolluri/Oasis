-- No payouts without location verification (anti-scam).
-- Claims are created as pending_verification; payout only after rider verifies location.

-- Add new claim status (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'claim_status' AND e.enumlabel = 'pending_verification'
  ) THEN
    ALTER TYPE claim_status ADD VALUE 'pending_verification';
  END IF;
END $$;

-- Wallet: only count claims that have been paid (after location verification)
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
WHERE  pc.status = 'paid'
GROUP  BY wp.profile_id;

ALTER VIEW rider_wallet SET (security_invoker = true);
COMMENT ON VIEW rider_wallet IS 'Aggregated payout wallet per rider — only paid claims (after location verification)';
