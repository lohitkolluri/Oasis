-- Fix claim_status enum to include 'pending_verification' which the application
-- code uses extensively (engine.ts inserts this status). Without this value the
-- INSERT fails silently because parametric_claims.status is typed as claim_status.

ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'pending_verification';

COMMENT ON TYPE claim_status IS 'Claim lifecycle: triggered → pending_verification → paid (or skipped if weekly_cap_reached)';
