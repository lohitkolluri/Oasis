-- One active weekly_policies row per rider (loss-of-income weekly product).
-- One-off Razorpay checkout previously activated a row without deactivating siblings.

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
BEGIN
  INSERT INTO razorpay_payment_events (razorpay_payment_id)
  VALUES (p_payment_id)
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING razorpay_payment_id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN 'already_processed';
  END IF;

  -- Align with process_razorpay_subscription_payment: only one active week per profile.
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
    AND profile_id = p_profile_id;

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
  'Idempotent Razorpay one-off payment: activates one policy row; deactivates other active weeks for the same rider.';

-- One-time cleanup: keep newest active week per profile, deactivate older active rows.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY profile_id
      ORDER BY week_start_date DESC, created_at DESC
    ) AS rn
  FROM public.weekly_policies
  WHERE is_active = true
)
UPDATE public.weekly_policies wp
SET
  is_active = false,
  updated_at = NOW()
FROM ranked r
WHERE wp.id = r.id
  AND r.rn > 1;
