-- Claim status
CREATE TYPE claim_status AS ENUM ('triggered', 'paid');

-- Parametric claims: auto-initiated when disruption triggers
CREATE TABLE parametric_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES weekly_policies(id) ON DELETE CASCADE,
  disruption_event_id UUID NOT NULL REFERENCES live_disruption_events(id) ON DELETE RESTRICT,
  payout_amount_inr NUMERIC(10, 2) NOT NULL,
  status claim_status DEFAULT 'triggered',
  gateway_transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parametric_claims_policy ON parametric_claims(policy_id);
CREATE INDEX idx_parametric_claims_status ON parametric_claims(status);
CREATE INDEX idx_parametric_claims_created ON parametric_claims(created_at DESC);

ALTER TABLE parametric_claims ENABLE ROW LEVEL SECURITY;

-- RLS: Riders see only claims for their policies
CREATE POLICY "Users can view own claims"
  ON parametric_claims FOR SELECT
  USING (
    policy_id IN (
      SELECT wp.id FROM weekly_policies wp
      JOIN profiles p ON wp.profile_id = p.id
      WHERE p.id = auth.uid()
    )
  );

-- Insert/update via service role (Edge Functions)
CREATE POLICY "Allow service role full access"
  ON parametric_claims FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin role for future admin dashboard (optional)
-- CREATE POLICY "Admins can view all claims" ...

COMMENT ON TABLE parametric_claims IS 'Automated loss-of-income claims - zero manual processing';
