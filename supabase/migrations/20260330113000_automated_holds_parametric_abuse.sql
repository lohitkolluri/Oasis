-- ============================================================
-- Migration: Automated holds (parametric abuse / fraud)
-- Purpose  : Persist explainable automated holds with a
--            human-readable reason trail (not score-only).
-- ============================================================

CREATE TABLE IF NOT EXISTS automated_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stage in the lifecycle where the hold was placed.
  stage TEXT NOT NULL CHECK (stage IN ('pre_claim', 'pre_payout')),
  -- Linkages (some holds happen before a claim exists).
  claim_id UUID REFERENCES parametric_claims(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES weekly_policies(id) ON DELETE SET NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  disruption_event_id UUID REFERENCES live_disruption_events(id) ON DELETE SET NULL,

  -- High-signal summary (for tables/search) + full trail (for explainability).
  hold_type TEXT NOT NULL DEFAULT 'abuse',
  reason TEXT NOT NULL,
  reason_trail JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Resolution state (admins can later clear / reject).
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'rejected')),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automated_holds_profile_created
  ON automated_holds (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automated_holds_claim_created
  ON automated_holds (claim_id, created_at DESC)
  WHERE claim_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automated_holds_event_created
  ON automated_holds (disruption_event_id, created_at DESC)
  WHERE disruption_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automated_holds_status_created
  ON automated_holds (status, created_at DESC)
  WHERE status = 'held';

ALTER TABLE automated_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access automated_holds" ON automated_holds;
CREATE POLICY "Service role full access automated_holds"
  ON automated_holds FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE automated_holds IS
  'Explainable automated holds for parametric abuse signals; stores human-readable reason trail.';

