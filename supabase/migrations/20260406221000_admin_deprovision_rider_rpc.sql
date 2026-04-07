-- Deprovision rider entirely in Postgres so PostgREST schema cache cannot block updates
-- to newly added columns (e.g. deprovisioned_at).
--
-- Columns may also be added in 20260406213000; duplicate IF NOT EXISTS is safe.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deprovisioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deprovisioned_reason TEXT;

CREATE OR REPLACE FUNCTION public.admin_deprovision_rider(
  p_profile_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_reason text := left(trim(coalesce(p_reason, '')), 240);
  v_rowcount int;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id AND role = 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot deprovision admin accounts');
  END IF;

  UPDATE public.profiles
  SET
    deprovisioned_at = v_now,
    deprovisioned_reason = NULLIF(v_reason, ''),
    full_name = NULL,
    phone_number = NULL,
    payment_routing_id = NULL,
    primary_zone_geofence = NULL,
    zone_latitude = NULL,
    zone_longitude = NULL,
    government_id_url = NULL,
    government_id_verified = false,
    government_id_verification_result = NULL,
    face_photo_url = NULL,
    face_verified = false,
    auto_renew_enabled = false,
    razorpay_customer_id = NULL,
    razorpay_subscription_id = NULL,
    updated_at = v_now
  WHERE id = p_profile_id;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  IF v_rowcount = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profile not found');
  END IF;

  UPDATE public.weekly_policies
  SET is_active = false, updated_at = v_now
  WHERE profile_id = p_profile_id AND is_active = true;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.admin_deprovision_rider(uuid, text) IS
  'Soft-deprovision rider: scrub PII, disable auto-renew, deactivate active policies. Bypasses PostgREST PATCH schema cache.';

GRANT EXECUTE ON FUNCTION public.admin_deprovision_rider(uuid, text) TO service_role;
