-- Persist composite fraud risk (0–100) and interpretable breakdown for analytics and admin review.
-- Normalized cluster/baseline logic lives in application code; these columns are storage only.
--
-- Use pg_catalog to add CHECK constraints only when missing (avoids NOTICE from DROP CONSTRAINT IF EXISTS).

ALTER TABLE parametric_claims
  ADD COLUMN IF NOT EXISTS fraud_risk_score SMALLINT,
  ADD COLUMN IF NOT EXISTS fraud_risk_tier TEXT,
  ADD COLUMN IF NOT EXISTS fraud_risk_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN parametric_claims.fraud_risk_score IS 'Composite 0–100 fraud risk after extended checks (claim creation / verification pipeline)';
COMMENT ON COLUMN parametric_claims.fraud_risk_tier IS 'low | elevated | high — derived from fraud_risk_score';
COMMENT ON COLUMN parametric_claims.fraud_risk_breakdown IS 'Structured factors contributing to fraud_risk_score';

CREATE INDEX IF NOT EXISTS idx_parametric_claims_fraud_risk_score
  ON parametric_claims (fraud_risk_score DESC)
  WHERE fraud_risk_score IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    INNER JOIN pg_catalog.pg_class r ON r.oid = c.conrelid
    INNER JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'parametric_claims'
      AND c.conname = 'parametric_claims_fraud_risk_score_check'
  ) THEN
    ALTER TABLE public.parametric_claims
      ADD CONSTRAINT parametric_claims_fraud_risk_score_check
      CHECK (fraud_risk_score IS NULL OR (fraud_risk_score >= 0 AND fraud_risk_score <= 100));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    INNER JOIN pg_catalog.pg_class r ON r.oid = c.conrelid
    INNER JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'parametric_claims'
      AND c.conname = 'parametric_claims_fraud_risk_tier_check'
  ) THEN
    ALTER TABLE public.parametric_claims
      ADD CONSTRAINT parametric_claims_fraud_risk_tier_check
      CHECK (
        fraud_risk_tier IS NULL
        OR fraud_risk_tier IN ('low', 'elevated', 'high')
      );
  END IF;
END $$;
