-- RPC helpers for Postgres advisory locks (mutual exclusion for crons/workers).

CREATE OR REPLACE FUNCTION public.oasis_try_advisory_lock(p_key BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pg_try_advisory_lock(p_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.oasis_advisory_unlock(p_key BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pg_advisory_unlock(p_key);
END;
$$;
