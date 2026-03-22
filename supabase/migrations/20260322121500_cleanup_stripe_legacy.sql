-- Cleanup legacy stripe webhook events and stripe payment columns now that the switch to Razorpay is complete.

DROP TABLE IF EXISTS stripe_webhook_events;

ALTER TABLE payment_transactions
  DROP COLUMN IF EXISTS stripe_checkout_session_id,
  DROP COLUMN IF EXISTS stripe_payment_intent_id;

-- Update the log rotation function to remove Stripe webhooks pruning

DROP FUNCTION IF EXISTS public.rotate_logs(INT, INT, INT, INT, INT);
DROP FUNCTION IF EXISTS public.rotate_logs(INT, INT, INT, INT);

CREATE OR REPLACE FUNCTION public.rotate_logs(
  p_system_logs_days INT DEFAULT 30,
  p_read_notifications_days INT DEFAULT 7,
  p_unread_notifications_days INT DEFAULT 30,
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

  DELETE FROM razorpay_payment_events
  WHERE processed_at < NOW() - (p_razorpay_payment_events_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_razorpay_payment_events_deleted = ROW_COUNT;

  INSERT INTO system_logs (event_type, severity, metadata)
  VALUES ('log_rotation', 'info', jsonb_build_object(
    'system_logs_deleted', v_system_logs_deleted,
    'notifications_deleted', v_notifications_deleted,
    'rate_limit_deleted', v_rate_limit_deleted,
    'razorpay_payment_events_deleted', v_razorpay_payment_events_deleted,
    'retention_days', jsonb_build_object(
      'system_logs', p_system_logs_days,
      'read_notifications', p_read_notifications_days,
      'unread_notifications', p_unread_notifications_days,
      'razorpay_payment_events', p_razorpay_payment_events_days
    )
  ));

  RETURN jsonb_build_object(
    'system_logs_deleted', v_system_logs_deleted,
    'notifications_deleted', v_notifications_deleted,
    'rate_limit_deleted', v_rate_limit_deleted,
    'razorpay_payment_events_deleted', v_razorpay_payment_events_deleted
  );
END;
$function$;
