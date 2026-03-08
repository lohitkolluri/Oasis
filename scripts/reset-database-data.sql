-- ============================================================
-- Reset application data (start from scratch)
--
-- How to run:
--   1. Supabase Dashboard → SQL Editor → paste this file → Run
--   2. From terminal (need DB URL from Dashboard → Settings → Database):
--      psql "postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres" -f scripts/reset-database-data.sql
--
-- This truncates all app tables in FK-safe order. auth.users are NOT deleted;
-- existing logins will have no profile and can re-onboard.
-- ============================================================

-- Disable triggers that might block truncate (optional; CASCADE handles FKs)
-- Truncate in dependency order (children first)

TRUNCATE TABLE rider_notifications CASCADE;
TRUNCATE TABLE payout_ledger CASCADE;
TRUNCATE TABLE claim_verifications CASCADE;
TRUNCATE TABLE parametric_claims CASCADE;
TRUNCATE TABLE payment_transactions CASCADE;
TRUNCATE TABLE weekly_policies CASCADE;
TRUNCATE TABLE premium_recommendations CASCADE;
TRUNCATE TABLE rider_delivery_reports CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE live_disruption_events CASCADE;
TRUNCATE TABLE plan_packages CASCADE;
TRUNCATE TABLE stripe_webhook_events CASCADE;
TRUNCATE TABLE rate_limit_entries CASCADE;
TRUNCATE TABLE system_logs CASCADE;

-- app_config: clear and re-seed defaults so cron jobs still have placeholders
TRUNCATE TABLE app_config CASCADE;
INSERT INTO app_config (key, value)
VALUES
  ('cron_base_url', 'https://your-app.vercel.app'),
  ('cron_secret', 'REPLACE_WITH_CRON_SECRET')
ON CONFLICT (key) DO NOTHING;

-- Re-seed plan_packages so policy subscription and payouts work after reset
INSERT INTO plan_packages (slug, name, description, weekly_premium_inr, payout_per_claim_inr, max_claims_per_week, sort_order)
VALUES
  ('basic', 'Basic', 'Essential income protection for low-risk zones', 79, 300, 2, 1),
  ('standard', 'Standard', 'Balanced coverage for most delivery partners', 99, 400, 2, 2),
  ('premium', 'Premium', 'Maximum coverage for high-risk zones', 149, 600, 3, 3)
ON CONFLICT (slug) DO NOTHING;
