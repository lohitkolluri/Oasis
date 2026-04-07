-- Admin rider deprovisioning (soft delete).
-- We must retain policies/claims for audit, so we disable access and scrub PII.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deprovisioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deprovisioned_reason TEXT;

COMMENT ON COLUMN profiles.deprovisioned_at IS 'When the rider was deprovisioned (disabled) by an admin.';
COMMENT ON COLUMN profiles.deprovisioned_reason IS 'Optional admin-entered reason for deprovisioning.';

CREATE INDEX IF NOT EXISTS idx_profiles_deprovisioned_at
  ON profiles (deprovisioned_at)
  WHERE deprovisioned_at IS NOT NULL;

