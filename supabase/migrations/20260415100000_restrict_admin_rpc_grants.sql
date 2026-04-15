-- Restrict admin-only RPCs to service_role.
-- Previously these were granted to `authenticated`, allowing any logged-in user
-- to read global financial aggregates via PostgREST.

REVOKE EXECUTE ON FUNCTION admin_window_metrics(TIMESTAMPTZ, DATE, TIMESTAMPTZ) FROM authenticated;
REVOKE EXECUTE ON FUNCTION admin_plan_financials() FROM authenticated;
