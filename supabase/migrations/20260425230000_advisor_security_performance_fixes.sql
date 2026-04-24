-- Supabase advisor fixes for the fresh OasisBKP setup.
-- Keep this migration narrow: fix external-facing security findings and one
-- confirmed duplicate index without pruning fresh-database "unused index" noise.

ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- The app already grants service_role access via "Service role full access rate_limit".
-- No anon/authenticated policies are required because callers use the RPC function.

DROP INDEX IF EXISTS public.idx_parametric_claims_disruption_event;
