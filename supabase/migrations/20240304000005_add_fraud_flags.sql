-- Fraud detection flags on parametric claims
ALTER TABLE parametric_claims
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_parametric_claims_flagged ON parametric_claims(is_flagged) WHERE is_flagged = true;

COMMENT ON COLUMN parametric_claims.is_flagged IS 'Set by fraud detection: GPS spoofing, weather mismatch, duplicate';
COMMENT ON COLUMN parametric_claims.flag_reason IS 'Human-readable reason for flag';
