-- Idempotent: safe if 20260406213000_profiles_deprovision.sql already ran.
-- Ensures deprovision columns exist before admin_deprovision_rider RPC runs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deprovisioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deprovisioned_reason TEXT;

COMMENT ON COLUMN public.profiles.deprovisioned_at IS 'When the rider was deprovisioned (disabled) by an admin.';
COMMENT ON COLUMN public.profiles.deprovisioned_reason IS 'Optional admin-entered reason for deprovisioning.';

CREATE INDEX IF NOT EXISTS idx_profiles_deprovisioned_at
  ON public.profiles (deprovisioned_at)
  WHERE deprovisioned_at IS NOT NULL;
