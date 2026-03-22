-- Razorpay payment idempotency and atomic activation (test keys enforced in app).

CREATE TABLE IF NOT EXISTS razorpay_payment_events (
  razorpay_payment_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_payment_events_processed_at
  ON razorpay_payment_events(processed_at);

COMMENT ON TABLE razorpay_payment_events IS 'Processed Razorpay payment IDs for idempotency (verify + webhook)';

ALTER TABLE razorpay_payment_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE weekly_policies
  ADD COLUMN IF NOT EXISTS razorpay_payment_method TEXT;

COMMENT ON COLUMN weekly_policies.razorpay_payment_method IS 'Razorpay payment method (card, upi, netbanking, wallet, …)';

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS razorpay_payment_method TEXT;

COMMENT ON COLUMN payment_transactions.razorpay_payment_method IS 'Razorpay payment method for this transaction';

CREATE POLICY "Service role full access razorpay_payment_events"
  ON razorpay_payment_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION process_razorpay_payment_event(
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

  UPDATE weekly_policies
  SET
    is_active = true,
    razorpay_order_id = COALESCE(razorpay_order_id, p_order_id),
    razorpay_payment_id = p_payment_id,
    razorpay_payment_method = p_payment_method,
    payment_status = 'paid',
    updated_at = NOW()
  WHERE id = p_policy_id;

  UPDATE payment_transactions
  SET
    razorpay_order_id = COALESCE(razorpay_order_id, p_order_id),
    razorpay_payment_id = p_payment_id,
    razorpay_payment_method = p_payment_method,
    status = 'paid',
    paid_at = NOW()
  WHERE weekly_policy_id = p_policy_id
    AND status = 'pending';

  IF NOT FOUND THEN
    INSERT INTO payment_transactions (
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

COMMENT ON FUNCTION process_razorpay_payment_event(TEXT, UUID, TEXT, UUID, NUMERIC, TEXT) IS 'Idempotent Razorpay payment processing; activates policy and marks transaction paid.';

-- Extend log rotation to prune Razorpay idempotency rows.
CREATE OR REPLACE FUNCTION public.rotate_logs(
  p_system_logs_days INT DEFAULT 30,
  p_read_notifications_days INT DEFAULT 7,
  p_unread_notifications_days INT DEFAULT 30,
  p_stripe_webhooks_days INT DEFAULT 90,
  p_razorpay_payment_events_days INT DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_system_logs_deleted BIGINT;
  v_notifications_deleted BIGINT;
  v_rate_limit_deleted BIGINT;
  v_stripe_webhooks_deleted BIGINT;
  v_razorpay_payment_events_deleted BIGINT;
BEGIN
  DELETE FROM system_logs
  WHERE created_at < NOW() - (p_system_logs_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_system_logs_deleted = ROW_COUNT;

  DELETE FROM rider_notifications
  WHERE
    (read_at IS NOT NULL AND created_at < NOW() - (p_read_notifications_days || ' days')::INTERVAL)
    OR
    (read_at IS NULL AND created_at < NOW() - (p_unread_notifications_days || ' days')::INTERVAL);
  GET DIAGNOSTICS v_notifications_deleted = ROW_COUNT;

  DELETE FROM rate_limit_entries
  WHERE reset_at < NOW();
  GET DIAGNOSTICS v_rate_limit_deleted = ROW_COUNT;

  DELETE FROM stripe_webhook_events
  WHERE processed_at < NOW() - (p_stripe_webhooks_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_stripe_webhooks_deleted = ROW_COUNT;

  DELETE FROM razorpay_payment_events
  WHERE processed_at < NOW() - (p_razorpay_payment_events_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_razorpay_payment_events_deleted = ROW_COUNT;

  INSERT INTO system_logs (event_type, severity, metadata)
  VALUES ('log_rotation', 'info', jsonb_build_object(
    'system_logs_deleted', v_system_logs_deleted,
    'notifications_deleted', v_notifications_deleted,
    'rate_limit_deleted', v_rate_limit_deleted,
    'stripe_webhooks_deleted', v_stripe_webhooks_deleted,
    'razorpay_payment_events_deleted', v_razorpay_payment_events_deleted,
    'retention_days', jsonb_build_object(
      'system_logs', p_system_logs_days,
      'read_notifications', p_read_notifications_days,
      'unread_notifications', p_unread_notifications_days,
      'stripe_webhooks', p_stripe_webhooks_days,
      'razorpay_payment_events', p_razorpay_payment_events_days
    )
  ));

  RETURN jsonb_build_object(
    'system_logs_deleted', v_system_logs_deleted,
    'notifications_deleted', v_notifications_deleted,
    'rate_limit_deleted', v_rate_limit_deleted,
    'stripe_webhooks_deleted', v_stripe_webhooks_deleted,
    'razorpay_payment_events_deleted', v_razorpay_payment_events_deleted
  );
END;
$function$;
