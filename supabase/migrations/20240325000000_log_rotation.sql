-- ============================================================================
-- LOG ROTATION
-- Automated cleanup of append-only tables to prevent unbounded growth.
-- Retention: system_logs 30d, read notifications 7d, unread notifications 30d,
--           rate_limit expired entries, stripe_webhook_events 90d.
-- Runs daily at 21:00 UTC (02:30 IST) via pg_cron.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rotate_logs(
  p_system_logs_days INT DEFAULT 30,
  p_read_notifications_days INT DEFAULT 7,
  p_unread_notifications_days INT DEFAULT 30,
  p_stripe_webhooks_days INT DEFAULT 90
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
BEGIN
  -- system_logs: keep last N days
  DELETE FROM system_logs
  WHERE created_at < NOW() - (p_system_logs_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_system_logs_deleted = ROW_COUNT;

  -- rider_notifications: read ones expire faster than unread
  DELETE FROM rider_notifications
  WHERE
    (read_at IS NOT NULL AND created_at < NOW() - (p_read_notifications_days || ' days')::INTERVAL)
    OR
    (read_at IS NULL AND created_at < NOW() - (p_unread_notifications_days || ' days')::INTERVAL);
  GET DIAGNOSTICS v_notifications_deleted = ROW_COUNT;

  -- rate_limit_entries: remove expired windows
  DELETE FROM rate_limit_entries
  WHERE reset_at < NOW();
  GET DIAGNOSTICS v_rate_limit_deleted = ROW_COUNT;

  -- stripe_webhook_events: idempotency records older than N days
  DELETE FROM stripe_webhook_events
  WHERE processed_at < NOW() - (p_stripe_webhooks_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_stripe_webhooks_deleted = ROW_COUNT;

  -- Log the rotation itself
  INSERT INTO system_logs (event_type, severity, metadata)
  VALUES ('log_rotation', 'info', jsonb_build_object(
    'system_logs_deleted', v_system_logs_deleted,
    'notifications_deleted', v_notifications_deleted,
    'rate_limit_deleted', v_rate_limit_deleted,
    'stripe_webhooks_deleted', v_stripe_webhooks_deleted,
    'retention_days', jsonb_build_object(
      'system_logs', p_system_logs_days,
      'read_notifications', p_read_notifications_days,
      'unread_notifications', p_unread_notifications_days,
      'stripe_webhooks', p_stripe_webhooks_days
    )
  ));

  RETURN jsonb_build_object(
    'system_logs_deleted', v_system_logs_deleted,
    'notifications_deleted', v_notifications_deleted,
    'rate_limit_deleted', v_rate_limit_deleted,
    'stripe_webhooks_deleted', v_stripe_webhooks_deleted
  );
END;
$function$;

-- Schedule: daily at 21:00 UTC (02:30 IST)
SELECT cron.schedule(
  'oasis_rotate_logs',
  '0 21 * * *',
  $$SELECT rotate_logs()$$
);
