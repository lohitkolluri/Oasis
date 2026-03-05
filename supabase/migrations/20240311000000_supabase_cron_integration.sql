-- ============================================================
-- Migration: Supabase Cron integration
-- Purpose : Use pg_cron inside Supabase instead of GitHub Actions/Vercel Cron.
--           Stores base_url and cron_secret in app_config for persistence.
--           Add adjudicator (hourly) + fix weekly-premium to read from DB.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. APP CONFIG TABLE
--    Persistent key-value for cron jobs (session-scoped set_config
--    does not persist across pg_cron invocations).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Placeholder values — UPDATE these after deployment
-- Supabase Dashboard → SQL Editor:
--   UPDATE app_config SET value = 'https://your-app.vercel.app' WHERE key = 'cron_base_url';
--   UPDATE app_config SET value = 'your-cron-secret' WHERE key = 'cron_secret';
INSERT INTO app_config (key, value)
VALUES
  ('cron_base_url', 'https://your-app.vercel.app'),
  ('cron_secret', 'REPLACE_WITH_CRON_SECRET')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE app_config IS 'App configuration for pg_cron HTTP jobs. Update cron_base_url and cron_secret after deploy.';

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access app_config"
  ON app_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 2. CRON HTTP CALLERS
--    Call Next.js API only when app_config is configured.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION call_adjudicator_cron()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  base_url TEXT;
  secret   TEXT;
BEGIN
  SELECT value INTO base_url FROM app_config WHERE key = 'cron_base_url';
  SELECT value INTO secret   FROM app_config WHERE key = 'cron_secret';
  IF base_url IS NULL OR trim(base_url) = '' OR secret IS NULL OR trim(secret) = '' OR secret = 'REPLACE_WITH_CRON_SECRET' THEN
    RETURN;
  END IF;
  PERFORM net.http_get(
    url     := rtrim(base_url, '/') || '/api/cron/adjudicator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'User-Agent', 'Oasis-SupabaseCron/1.0'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION call_weekly_premium_cron()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  base_url TEXT;
  secret   TEXT;
BEGIN
  SELECT value INTO base_url FROM app_config WHERE key = 'cron_base_url';
  SELECT value INTO secret   FROM app_config WHERE key = 'cron_secret';
  IF base_url IS NULL OR trim(base_url) = '' OR secret IS NULL OR trim(secret) = '' OR secret = 'REPLACE_WITH_CRON_SECRET' THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := rtrim(base_url, '/') || '/api/cron/weekly-premium',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 3. UNSUBSCHEDULE OLD + SCHEDULE NEW JOBS
-- ──────────────────────────────────────────────────────────────
SELECT cron.unschedule(jobid)
FROM   cron.job
WHERE  jobname IN (
  'oasis_expire_policies',
  'oasis_weekly_premium_cron',
  'oasis_adjudicator_cron'
);

-- a) Nightly: expire stale policies
SELECT cron.schedule(
  'oasis_expire_policies',
  '30 19 * * *',
  $$ SELECT expire_stale_policies(); $$
);

-- b) Hourly: adjudicator — poll weather/news, create events + claims
SELECT cron.schedule(
  'oasis_adjudicator_cron',
  '0 * * * *',
  $$ SELECT call_adjudicator_cron(); $$
);

-- c) Weekly: premium renewal — Sunday 17:30 UTC (23:00 IST)
SELECT cron.schedule(
  'oasis_weekly_premium_cron',
  '30 17 * * 0',
  $$ SELECT call_weekly_premium_cron(); $$
);
