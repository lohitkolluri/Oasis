-- Atomic Stripe webhook: idempotency + policy/payment update in one transaction.
-- Ensures we never mark an event as processed without completing the work.
-- Caller uses service role.

CREATE OR REPLACE FUNCTION process_stripe_checkout_event(
  p_event_id TEXT,
  p_policy_id UUID,
  p_session_id TEXT,
  p_payment_intent_id TEXT,
  p_profile_id UUID,
  p_amount_inr NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_id UUID;
BEGIN
  -- 1) Claim idempotency: insert event_id; if already present, do nothing.
  INSERT INTO stripe_webhook_events (event_id)
  VALUES (p_event_id)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN 'already_processed';
  END IF;

  -- 2) Activate policy and record payment (same logic as process_checkout_completed).
  UPDATE weekly_policies
  SET
    is_active = true,
    stripe_payment_intent_id = p_payment_intent_id,
    payment_status = 'paid',
    updated_at = NOW()
  WHERE id = p_policy_id;

  UPDATE payment_transactions
  SET
    stripe_payment_intent_id = p_payment_intent_id,
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
      status,
      paid_at
    )
    VALUES (
      p_profile_id,
      p_policy_id,
      p_amount_inr,
      p_session_id,
      p_payment_intent_id,
      'paid',
      NOW()
    );
  END IF;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION process_stripe_checkout_event IS 'Idempotent Stripe checkout processing: insert event_id then update policy and payment in one transaction. Returns ok or already_processed.';
