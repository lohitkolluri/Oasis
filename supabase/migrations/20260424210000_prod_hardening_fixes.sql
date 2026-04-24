-- Production hardening: RLS role-escalation fix, idempotency correctness, missing indexes.
--
-- Fixes addressed in this migration:
--   1. Critical RLS gap: duplicate permissive UPDATE policies on public.profiles allowed a user
--      to escalate `role` to 'admin'. Consolidate into a single policy with WITH CHECK guard.
--   2. process_razorpay_payment_event: consumed idempotency row even if WHERE clause did not
--      match the target weekly_policy. Now rolls back via RAISE when no row is updated so the
--      razorpay_payment_events row is not persisted (and Razorpay webhook gets a retryable error).
--   3. Missing index on weekly_policies(razorpay_order_id) — used by webhook + verify paths on
--      every payment; partial index avoids bloat from NULLs.

-- ──────────────────────────────────────────────────────────────
-- 1. profiles UPDATE policy consolidation (role immutability)
-- ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Drop every permissive UPDATE policy on public.profiles so only the guarded one remains.
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
  DROP POLICY IF EXISTS "Users can update own profile"                ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile (no role change)" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_self_no_role"                ON public.profiles;
END
$$;

CREATE POLICY "profiles_update_self_no_role"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  );

COMMENT ON POLICY "profiles_update_self_no_role" ON public.profiles IS
  'Single, role-immutable self UPDATE policy. Use a SECURITY DEFINER RPC to change role.';

-- ──────────────────────────────────────────────────────────────
-- 2. process_razorpay_payment_event: activate or rollback
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.process_razorpay_payment_event(
  p_payment_id TEXT,
  p_policy_id UUID,
  p_order_id TEXT,
  p_profile_id UUID,
  p_amount_inr NUMERIC,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted TEXT;
  v_updated_id UUID;
BEGIN
  INSERT INTO razorpay_payment_events (razorpay_payment_id)
  VALUES (p_payment_id)
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING razorpay_payment_id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN 'already_processed';
  END IF;

  UPDATE public.weekly_policies
  SET is_active = false, updated_at = NOW()
  WHERE profile_id = p_profile_id
    AND is_active = true
    AND id <> p_policy_id;

  UPDATE public.weekly_policies
  SET
    is_active = true,
    razorpay_order_id = COALESCE(razorpay_order_id, p_order_id),
    razorpay_payment_id = p_payment_id,
    razorpay_payment_method = p_payment_method,
    payment_status = 'paid',
    updated_at = NOW()
  WHERE id = p_policy_id
    AND profile_id = p_profile_id
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    -- Row did not exist / profile mismatch: raise so the INSERT above is rolled back
    -- (exception unwinds the whole function — including razorpay_payment_events insert).
    -- Webhook / verify route will receive an error and can retry with the correct policy id.
    RAISE EXCEPTION 'process_razorpay_payment_event: policy % not found for profile %', p_policy_id, p_profile_id;
  END IF;

  UPDATE public.payment_transactions
  SET
    razorpay_order_id = COALESCE(razorpay_order_id, p_order_id),
    razorpay_payment_id = p_payment_id,
    razorpay_payment_method = p_payment_method,
    status = 'paid',
    paid_at = NOW()
  WHERE weekly_policy_id = p_policy_id
    AND status = 'pending';

  IF NOT FOUND THEN
    INSERT INTO public.payment_transactions (
      profile_id,
      weekly_policy_id,
      amount_inr,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_payment_method,
      status,
      paid_at
    )
    VALUES (
      p_profile_id,
      p_policy_id,
      p_amount_inr,
      p_order_id,
      p_payment_id,
      p_payment_method,
      'paid',
      NOW()
    );
  END IF;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.process_razorpay_payment_event(TEXT, UUID, TEXT, UUID, NUMERIC, TEXT) IS
  'Idempotent Razorpay payment processing; rolls back idempotency row on policy mismatch.';

-- ──────────────────────────────────────────────────────────────
-- 3. Index: weekly_policies(razorpay_order_id) partial
-- ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_weekly_policies_razorpay_order
  ON public.weekly_policies(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
