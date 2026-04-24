-- Supabase advisor remediation (security + performance)
-- Scope:
-- 1) Fix mutable search_path warnings on app-defined/public functions.
-- 2) Add covering indexes for unindexed foreign keys on public tables.
-- 3) Optimize RLS policy to avoid per-row auth.uid() re-evaluation.

-- 1) SECURITY: lock function search_path for stable, safer execution.
DO $$
BEGIN
  IF to_regprocedure('public.pgmq_send_self_report_verification(jsonb)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.pgmq_send_self_report_verification(jsonb) SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.pgmq_read_self_report_verification(integer, integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.pgmq_read_self_report_verification(integer, integer) SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.pgmq_delete_self_report_verification(bigint)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.pgmq_delete_self_report_verification(bigint) SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.prevent_admin_audit_log_mutation()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.prevent_admin_audit_log_mutation() SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.ist_date(timestamp with time zone)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.ist_date(timestamp with time zone) SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.coverage_week_range_ist(timestamp with time zone)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.coverage_week_range_ist(timestamp with time zone) SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.prevent_parametric_ledger_mutation()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.prevent_parametric_ledger_mutation() SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.enrollment_week_range_ist(timestamp with time zone)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.enrollment_week_range_ist(timestamp with time zone) SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.ist_week_monday_ymd(timestamp with time zone)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.ist_week_monday_ymd(timestamp with time zone) SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.set_updated_at_metadata()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.set_updated_at_metadata() SET search_path = public, pg_temp';
  END IF;
END
$$;

-- 2) PERFORMANCE: add covering indexes for FK columns flagged by advisor.
CREATE INDEX IF NOT EXISTS idx_automated_holds_policy_id
  ON public.automated_holds(policy_id);
CREATE INDEX IF NOT EXISTS idx_live_disruption_events_rule_set_id
  ON public.live_disruption_events(rule_set_id);
CREATE INDEX IF NOT EXISTS idx_parametric_rule_sets_created_by
  ON public.parametric_rule_sets(created_by);
CREATE INDEX IF NOT EXISTS idx_parametric_trigger_ledger_disruption_event_id
  ON public.parametric_trigger_ledger(disruption_event_id);
CREATE INDEX IF NOT EXISTS idx_parametric_trigger_ledger_replay_of_disruption_id
  ON public.parametric_trigger_ledger(replay_of_disruption_id);
CREATE INDEX IF NOT EXISTS idx_parametric_trigger_ledger_rule_set_id
  ON public.parametric_trigger_ledger(rule_set_id);

-- 3) PERFORMANCE: avoid per-row auth.uid() calls in RLS policy.
DROP POLICY IF EXISTS "Riders manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Riders manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);
