-- Auto-renewal via Razorpay Subscriptions (weekly mandate / UPI Autopay in live mode).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.razorpay_customer_id IS 'Razorpay Customer id (cust_...) for subscriptions';
COMMENT ON COLUMN profiles.razorpay_subscription_id IS 'Razorpay Subscription id (sub_...) when auto-renew is active or pending auth';
COMMENT ON COLUMN profiles.auto_renew_enabled IS 'True when subscription is active and will renew weekly';

CREATE INDEX IF NOT EXISTS idx_profiles_razorpay_subscription
  ON profiles(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

ALTER TABLE plan_packages
  ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT;

COMMENT ON COLUMN plan_packages.razorpay_plan_id IS 'Razorpay Plan id (plan_...), created lazily via API';
