-- Weekly policy rows can be tied to a Razorpay subscription (mandate / UPI Autopay renewals).

ALTER TABLE weekly_policies
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

COMMENT ON COLUMN weekly_policies.razorpay_subscription_id IS 'Razorpay Subscription id when this row was created for or renewed by subscription billing';

CREATE INDEX IF NOT EXISTS idx_weekly_policies_razorpay_subscription
  ON weekly_policies(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

-- Idempotent subscription charge: activate pending first-week row, or insert renewal week and deactivate prior actives.
CREATE OR REPLACE FUNCTION process_razorpay_subscription_payment(
  p_payment_id TEXT,
  p_profile_id UUID,
  p_plan_id UUID,
  p_amount_inr NUMERIC,
  p_subscription_id TEXT,
  p_week_start DATE,
  p_week_end DATE,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted TEXT;
  v_pending_id UUID;
  v_new_policy_id UUID;
BEGIN
  INSERT INTO razorpay_payment_events (razorpay_payment_id)
  VALUES (p_payment_id)
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING razorpay_payment_id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN 'already_processed';
  END IF;

  SELECT id INTO v_pending_id
  FROM weekly_policies
  WHERE profile_id = p_profile_id
    AND razorpay_subscription_id = p_subscription_id
    AND payment_status = 'pending'
    AND is_active = false
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE weekly_policies
  SET is_active = false, updated_at = NOW()
  WHERE profile_id = p_profile_id AND is_active = true;

  IF v_pending_id IS NOT NULL THEN
    UPDATE weekly_policies
    SET
      is_active = true,
      razorpay_payment_id = p_payment_id,
      razorpay_payment_method = p_payment_method,
      payment_status = 'paid',
      updated_at = NOW()
    WHERE id = v_pending_id;

    UPDATE payment_transactions
    SET
      razorpay_payment_id = p_payment_id,
      razorpay_payment_method = p_payment_method,
      status = 'paid',
      paid_at = NOW()
    WHERE weekly_policy_id = v_pending_id AND status = 'pending';

    IF NOT FOUND THEN
      INSERT INTO payment_transactions (
        profile_id,
        weekly_policy_id,
        amount_inr,
        razorpay_payment_id,
        razorpay_payment_method,
        status,
        paid_at
      )
      VALUES (
        p_profile_id,
        v_pending_id,
        p_amount_inr,
        p_payment_id,
        p_payment_method,
        'paid',
        NOW()
      );
    END IF;
  ELSE
    INSERT INTO weekly_policies (
      profile_id,
      plan_id,
      week_start_date,
      week_end_date,
      weekly_premium_inr,
      is_active,
      payment_status,
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_payment_method
    )
    VALUES (
      p_profile_id,
      p_plan_id,
      p_week_start,
      p_week_end,
      p_amount_inr,
      true,
      'paid',
      p_subscription_id,
      p_payment_id,
      p_payment_method
    )
    RETURNING id INTO v_new_policy_id;

    INSERT INTO payment_transactions (
      profile_id,
      weekly_policy_id,
      amount_inr,
      razorpay_payment_id,
      razorpay_payment_method,
      status,
      paid_at
    )
    VALUES (
      p_profile_id,
      v_new_policy_id,
      p_amount_inr,
      p_payment_id,
      p_payment_method,
      'paid',
      NOW()
    );
  END IF;

  UPDATE profiles
  SET
    auto_renew_enabled = true,
    razorpay_subscription_id = p_subscription_id,
    updated_at = NOW()
  WHERE id = p_profile_id;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION process_razorpay_subscription_payment IS 'Idempotent Razorpay subscription charge: first payment activates pending row; renewals insert next week and mark profile auto_renew_enabled';
