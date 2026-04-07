-- Allow service_role to trigger PostgREST schema cache reload.
-- This helps when new columns are added and REST schema cache is stale.

CREATE OR REPLACE FUNCTION public.reload_pgrst_schema()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_notify('pgrst', 'reload schema');
$$;

GRANT EXECUTE ON FUNCTION public.reload_pgrst_schema() TO service_role;
