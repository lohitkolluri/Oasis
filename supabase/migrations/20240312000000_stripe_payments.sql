-- Replace Razorpay with Stripe for payment tracking
-- Keeps payment_status; adds Stripe-specific columns

-- weekly_policies: add Stripe columns (razorpay columns kept for any legacy data)
ALTER TABLE weekly_policies
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_weekly_policies_stripe_session
  ON weekly_policies(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

COMMENT ON COLUMN weekly_policies.stripe_checkout_session_id IS 'Stripe Checkout Session ID from create-checkout';
COMMENT ON COLUMN weekly_policies.stripe_payment_intent_id IS 'Stripe Payment Intent ID after successful payment';

-- payment_transactions: add Stripe columns
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

COMMENT ON TABLE payment_transactions IS 'Audit log of subscription payments via Stripe (or Razorpay legacy)';
