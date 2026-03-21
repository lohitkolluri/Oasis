-- Persist Stripe payment method type (card, upi, link, …) for rider-facing receipts.

ALTER TABLE weekly_policies
  ADD COLUMN IF NOT EXISTS stripe_payment_method_type TEXT;

COMMENT ON COLUMN weekly_policies.stripe_payment_method_type IS 'Stripe PaymentMethod.type from successful checkout (e.g. card, upi)';

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS stripe_payment_method_type TEXT;

COMMENT ON COLUMN payment_transactions.stripe_payment_method_type IS 'Stripe PaymentMethod.type for this transaction';

-- Replace 6-arg version only; otherwise PostgreSQL keeps both overloads and COMMENT ON FUNCTION errors (42725).
DROP FUNCTION IF EXISTS process_stripe_checkout_event(TEXT, UUID, TEXT, TEXT, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION process_stripe_checkout_event(
  p_event_id TEXT,
  p_policy_id UUID,
  p_session_id TEXT,
  p_payment_intent_id TEXT,
  p_profile_id UUID,
  p_amount_inr NUMERIC,
  p_payment_method_type TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_id UUID;
BEGIN
  INSERT INTO stripe_webhook_events (event_id)
  VALUES (p_event_id)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN 'already_processed';
  END IF;

  UPDATE weekly_policies
  SET
    is_active = true,
    stripe_payment_intent_id = p_payment_intent_id,
    stripe_payment_method_type = p_payment_method_type,
    payment_status = 'paid',
    updated_at = NOW()
  WHERE id = p_policy_id;

  UPDATE payment_transactions
  SET
    stripe_payment_intent_id = p_payment_intent_id,
    stripe_payment_method_type = p_payment_method_type,
    status = 'paid',
    paid_at = NOW()
  WHERE weekly_policy_id = p_policy_id
    AND status = 'pending';

  IF NOT FOUND THEN
    INSERT INTO payment_transactions (
      profile_id,
      weekly_policy_id,
      amount_inr,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      stripe_payment_method_type,
      status,
      paid_at
    )
    VALUES (
      p_profile_id,
      p_policy_id,
      p_amount_inr,
      p_session_id,
      p_payment_intent_id,
      p_payment_method_type,
      'paid',
      NOW()
    );
  END IF;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION process_stripe_checkout_event(TEXT, UUID, TEXT, TEXT, UUID, NUMERIC, TEXT) IS 'Idempotent Stripe checkout processing; stores payment method type when provided.';
