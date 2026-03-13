-- ============================================================
-- Reset application data (start from scratch)
--
-- How to run:
--   1. Supabase Dashboard → SQL Editor → paste this file → Run
--   2. From terminal (need DB URL from Dashboard → Settings → Database):
--      psql "postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres" -f scripts/reset-database-data.sql
--
-- This truncates all 15 app tables in FK-safe order:
--   rider_notifications, payout_ledger, claim_verifications,
--   parametric_claims, payment_transactions, weekly_policies,
--   premium_recommendations, rider_delivery_reports, profiles,
--   live_disruption_events, plan_packages, stripe_webhook_events,
--   rate_limit_entries, system_logs, app_config
--
-- The aqi_zone_baselines VIEW is auto-cleared (derives from live_disruption_events).
-- auth.users are NOT deleted by default; existing logins will have no profile
-- and can re-onboard. Uncomment the demo cleanup section below if needed.
--
-- After reset, run scripts/seed-demo-data.sql to populate demo data.
-- ============================================================

-- ─── Optional: Remove demo auth.users ─────────────────────────
-- Uncomment the block below to also remove demo rider accounts
-- from auth.users. Only needed if you previously ran seed-demo-data.sql.
--
-- DELETE FROM auth.identities WHERE user_id IN (
--   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
--   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
--   'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
--   'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
--   'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b'
-- );
-- DELETE FROM auth.users WHERE id IN (
--   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
--   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
--   'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
--   'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
--   'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b'
-- );

-- ─── Truncate in dependency order (children first) ────────────
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

-- ─── Supabase storage: remove all files (keeps buckets) ────────
TRUNCATE TABLE storage.objects CASCADE;

-- ─── app_config: clear and re-seed defaults so cron jobs still have placeholders
TRUNCATE TABLE app_config CASCADE;
INSERT INTO app_config (key, value)
VALUES
  ('cron_base_url', 'https://your-app.vercel.app'),
  ('cron_secret', 'REPLACE_WITH_CRON_SECRET')
ON CONFLICT (key) DO NOTHING;

-- ─── Re-seed plan_packages (actuarially-grounded pricing) ─────
-- Based on Indian Q-commerce rider earnings (₹6K–₹8K/week net),
-- existing micro-insurance precedents, and IRDAI micro-insurance guidelines.
INSERT INTO plan_packages (slug, name, description, weekly_premium_inr, payout_per_claim_inr, max_claims_per_week, sort_order)
VALUES
  ('basic',    'Basic',    'Covers fuel & food costs on disrupted days — your minimum safety net',    49,  300,  1, 1),
  ('standard', 'Standard', 'Replaces ~70% of a lost day''s income — the most popular plan',          99,  700,  2, 2),
  ('premium',  'Premium',  'Full income replacement + expenses for high-risk zones',                 199, 1500, 3, 3)
ON CONFLICT (slug) DO UPDATE SET
  description          = EXCLUDED.description,
  weekly_premium_inr   = EXCLUDED.weekly_premium_inr,
  payout_per_claim_inr = EXCLUDED.payout_per_claim_inr,
  max_claims_per_week  = EXCLUDED.max_claims_per_week,
  sort_order           = EXCLUDED.sort_order,
  updated_at           = NOW();
