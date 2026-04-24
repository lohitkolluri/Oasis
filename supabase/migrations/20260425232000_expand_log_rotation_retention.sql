-- Expand operational log rotation so append-only observability tables do not
-- grow forever. The mutation guards still block normal UPDATE/DELETE; the
-- SECURITY DEFINER rotation function enables a transaction-local maintenance
-- flag only while pruning old rows.

CREATE OR REPLACE FUNCTION public.prevent_parametric_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.allow_log_rotation_delete', true) = 'on' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'parametric_trigger_ledger is append-only';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.allow_log_rotation_delete', true) = 'on' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$;

DROP FUNCTION IF EXISTS public.rotate_logs(INT, INT, INT, INT);
DROP FUNCTION IF EXISTS public.rotate_logs(INT, INT, INT, INT, INT);
DROP FUNCTION IF EXISTS public.rotate_logs(INT, INT, INT, INT, INT, INT, INT);

CREATE OR REPLACE FUNCTION public.rotate_logs(
  p_system_logs_days INT DEFAULT 14,
  p_read_notifications_days INT DEFAULT 3,
  p_unread_notifications_days INT DEFAULT 14,
  p_razorpay_payment_events_days INT DEFAULT 60,
  p_parametric_ledger_days INT DEFAULT 60,
  p_dry_run_ledger_days INT DEFAULT 7,
  p_admin_audit_days INT DEFAULT 180
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_system_logs_deleted BIGINT := 0;
  v_notifications_deleted BIGINT := 0;
  v_rate_limit_deleted BIGINT := 0;
  v_razorpay_payment_events_deleted BIGINT := 0;
  v_parametric_ledger_deleted BIGINT := 0;
  v_admin_audit_deleted BIGINT := 0;
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

  PERFORM set_config('app.allow_log_rotation_delete', 'on', true);

  DELETE FROM parametric_trigger_ledger
  WHERE
    (is_dry_run = true AND created_at < NOW() - (p_dry_run_ledger_days || ' days')::INTERVAL)
    OR
    (created_at < NOW() - (p_parametric_ledger_days || ' days')::INTERVAL);
  GET DIAGNOSTICS v_parametric_ledger_deleted = ROW_COUNT;

  DELETE FROM admin_audit_log
  WHERE created_at < NOW() - (p_admin_audit_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_admin_audit_deleted = ROW_COUNT;

  PERFORM set_config('app.allow_log_rotation_delete', 'off', true);

  INSERT INTO system_logs (event_type, severity, metadata)
  VALUES ('log_rotation', 'info', jsonb_build_object(
    'system_logs_deleted', v_system_logs_deleted,
    'notifications_deleted', v_notifications_deleted,
    'rate_limit_deleted', v_rate_limit_deleted,
    'razorpay_payment_events_deleted', v_razorpay_payment_events_deleted,
    'parametric_ledger_deleted', v_parametric_ledger_deleted,
    'admin_audit_deleted', v_admin_audit_deleted,
    'retention_days', jsonb_build_object(
      'system_logs', p_system_logs_days,
      'read_notifications', p_read_notifications_days,
      'unread_notifications', p_unread_notifications_days,
      'razorpay_payment_events', p_razorpay_payment_events_days,
      'parametric_ledger', p_parametric_ledger_days,
      'dry_run_ledger', p_dry_run_ledger_days,
      'admin_audit', p_admin_audit_days
    )
  ));

  RETURN jsonb_build_object(
    'system_logs_deleted', v_system_logs_deleted,
    'notifications_deleted', v_notifications_deleted,
    'rate_limit_deleted', v_rate_limit_deleted,
    'razorpay_payment_events_deleted', v_razorpay_payment_events_deleted,
    'parametric_ledger_deleted', v_parametric_ledger_deleted,
    'admin_audit_deleted', v_admin_audit_deleted
  );
END;
$function$;

-- Keep exactly one scheduled rotation job even across repeated migrations/resets.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'oasis_rotate_logs';

SELECT cron.schedule(
  'oasis_rotate_logs',
  '0 21 * * *',
  $$SELECT public.rotate_logs()$$
);
