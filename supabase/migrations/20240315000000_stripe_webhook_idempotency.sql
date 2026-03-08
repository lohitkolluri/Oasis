-- Idempotency for Stripe webhooks: avoid double-processing the same event.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(event_id);
COMMENT ON TABLE stripe_webhook_events IS 'Processed Stripe webhook event IDs for idempotency';

-- Single transaction: activate policy and record payment.
-- Caller must use service role. Run after inserting into stripe_webhook_events.
CREATE OR REPLACE FUNCTION process_checkout_completed(
  p_policy_id UUID,
  p_session_id TEXT,
  p_payment_intent_id TEXT,
  p_profile_id UUID,
  p_amount_inr NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE weekly_policies
  SET
    is_active = true,
    stripe_payment_intent_id = p_payment_intent_id,
    payment_status = 'paid',
    updated_at = NOW()
  WHERE id = p_policy_id;

  -- Update existing pending transaction for this policy, or insert if none
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
END;
$$;

COMMENT ON FUNCTION process_checkout_completed IS 'Activates policy and records payment in one transaction. Idempotent per policy.';
