-- Post-claim verification: GPS + delivery declaration + optional proof
CREATE TYPE verification_status AS ENUM ('inside_geofence', 'outside_geofence');

CREATE TABLE claim_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES parametric_claims(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verified_lat NUMERIC(10, 7) NOT NULL,
  verified_lng NUMERIC(10, 7) NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status verification_status NOT NULL,
  declaration_confirmed BOOLEAN DEFAULT false,
  proof_url TEXT,
  declaration_at TIMESTAMPTZ,
  UNIQUE(claim_id, profile_id)
);

CREATE INDEX idx_claim_verifications_claim ON claim_verifications(claim_id);
CREATE INDEX idx_claim_verifications_profile ON claim_verifications(profile_id);

ALTER TABLE claim_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own verifications"
  ON claim_verifications FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can view own verifications"
  ON claim_verifications FOR SELECT
  USING (profile_id = auth.uid());

COMMENT ON TABLE claim_verifications IS 'Post-claim verification: GPS capture, delivery declaration, optional proof for fraud detection';
