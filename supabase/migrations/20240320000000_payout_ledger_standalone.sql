-- Payout ledger: ensures table exists for demo and verify-location payouts.
-- Safe to run even if 20240309000000_comprehensive_fixes already applied (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS payout_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES parametric_claims(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_inr NUMERIC(10,2) NOT NULL,
  payout_method TEXT NOT NULL DEFAULT 'upi_instant',
  status TEXT NOT NULL DEFAULT 'processing',
  mock_upi_ref TEXT,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE payout_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Riders see own payouts"
    ON payout_ledger FOR SELECT
    USING (auth.uid() = profile_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Service role full access payouts"
    ON payout_ledger FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_payout_ledger_claim ON payout_ledger (claim_id);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_profile ON payout_ledger (profile_id, initiated_at DESC);

COMMENT ON TABLE payout_ledger IS 'Simulated instant payout tracking for demo and location verification';
