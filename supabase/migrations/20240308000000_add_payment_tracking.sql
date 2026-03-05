-- Payment tracking on weekly_policies for Razorpay integration
ALTER TABLE weekly_policies
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT;

ALTER TABLE weekly_policies DROP CONSTRAINT IF EXISTS weekly_policies_payment_status_check;
ALTER TABLE weekly_policies ADD CONSTRAINT weekly_policies_payment_status_check
  CHECK (payment_status IS NULL OR payment_status IN ('pending', 'paid', 'failed', 'demo'));

CREATE INDEX IF NOT EXISTS idx_weekly_policies_payment_status
  ON weekly_policies(payment_status)
  WHERE payment_status IS NOT NULL;

COMMENT ON COLUMN weekly_policies.razorpay_order_id IS 'Razorpay order ID from create-order';
COMMENT ON COLUMN weekly_policies.razorpay_payment_id IS 'Razorpay payment ID after successful verify';
COMMENT ON COLUMN weekly_policies.payment_status IS 'pending, paid, failed, or demo (when PAYMENT_DEMO_MODE)';
