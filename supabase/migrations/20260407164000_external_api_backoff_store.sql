-- Durable backoff store for external API 429s (multi-instance safe).

CREATE TABLE IF NOT EXISTS public.external_api_backoff (
  key TEXT PRIMARY KEY,
  backoff_until TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE public.external_api_backoff IS
  'Backoff windows for external APIs when they return 429; prevents hammering across instances.';

CREATE OR REPLACE FUNCTION public.external_api_backoff_get(p_key TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT backoff_until FROM public.external_api_backoff WHERE key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.external_api_backoff_set(p_key TEXT, p_backoff_until TIMESTAMPTZ)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.external_api_backoff (key, backoff_until)
  VALUES (p_key, p_backoff_until)
  ON CONFLICT (key) DO UPDATE SET backoff_until = EXCLUDED.backoff_until;
$$;
