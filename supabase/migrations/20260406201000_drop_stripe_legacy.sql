-- Drop Stripe legacy schema now that Oasis uses Razorpay exclusively.
-- Safe to run multiple times (IF EXISTS everywhere).

-- 1) Tables used only for Stripe webhook idempotency
DROP TABLE IF EXISTS public.stripe_webhook_events;

-- 2) Stripe-only columns (no longer referenced by the app)
ALTER TABLE IF EXISTS public.weekly_policies
  DROP COLUMN IF EXISTS stripe_checkout_session_id,
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_payment_method_type;

ALTER TABLE IF EXISTS public.payment_transactions
  DROP COLUMN IF EXISTS stripe_checkout_session_id,
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_payment_method_type;

-- 3) Stripe-only helper functions
DROP FUNCTION IF EXISTS public.process_checkout_completed(UUID, TEXT, TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.process_stripe_checkout_event(TEXT, UUID, TEXT, TEXT, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.process_stripe_checkout_event(TEXT, UUID, TEXT, TEXT, UUID, NUMERIC, TEXT);

-- 4) Stripe-only indexes
DROP INDEX IF EXISTS public.idx_weekly_policies_stripe_session;
DROP INDEX IF EXISTS public.idx_stripe_webhook_events_event_id;
