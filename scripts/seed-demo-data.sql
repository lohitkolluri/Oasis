-- ============================================================
-- Seed Demo Data for Oasis Parametric Insurance Platform
--
-- Product scope (must match app rulebook):
--   Loss-of-income only when external disruptions (weather, zone restrictions,
--   traffic halts) block Q-commerce work — not health, accident, or vehicle repair.
--   Premiums are weekly on IST Monday–Sunday weeks (see lib/datetime/ist.ts).
--
-- Contents: eight demo riders, three IST weeks of policies, disruption events,
-- claims (including fraud-review samples), verifications, payouts, notifications.
--
-- Run: Supabase Dashboard → SQL Editor → paste → Run
-- Optional: scripts/sync-non-seed-rider-accounts.sql after edits
--
-- Logins (password Demo@1234): saumy@demo.com, varun@demo.com, aditya@demo.com,
--   alok@demo.com, utkarsh@demo.com, roshan@demo.com, sahil@demo.com,
--   aniket@demo.com;
--   admin.demo@oasis.app (admin console)
-- ============================================================

DO $$
DECLARE
  -- Rider UUIDs (fixed for reproducibility)
  r1 UUID := 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'; -- Saumy Bhardwaj, Bengaluru
  r2 UUID := 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'; -- Varun Prakash, Mumbai
  r3 UUID := 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f'; -- Aditya Sinha, Delhi
  r4 UUID := 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a'; -- Alok Kumar, Noida
  r5 UUID := 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b'; -- Utkarsh Singh, Pune
  r6 UUID := 'f6a7b8c9-d0e1-4f2a-8b3c-5d6e7f8a9b0c'; -- Roshan Kumar, Hyderabad
  r7 UUID := '07b8c9d0-e1f2-4a3b-8c5d-6e7f8a9b0c1d'; -- Sahil Ali, Kolkata
  r8 UUID := '18c9d0e1-f2a3-4b4c-9d6e-7f8a9b0c1d2e'; -- Aniket Raj, Gurugram
  admin1 UUID := '0a0b0c0d-1111-4aaa-8bbb-222233334444'; -- Admin user

  -- Event UUIDs (current + previous week)
  ev_heat    UUID := 'e1e1e1e1-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  ev_rain_m  UUID := 'e2e2e2e2-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  ev_aqi     UUID := 'e3e3e3e3-cccc-4ccc-8ccc-cccccccccccc';
  ev_traffic UUID := 'e4e4e4e4-dddd-4ddd-8ddd-dddddddddddd';
  ev_curfew  UUID := 'e5e5e5e5-eeee-4eee-8eee-eeeeeeeeeeee';
  ev_rain_c  UUID := 'e6e6e6e6-ffff-4fff-8fff-ffffffffffff';
  ev_heat2   UUID := 'e7e7e7e7-1111-4111-8111-111111111111';
  ev_rain_pw UUID := 'e8e8e8e8-2222-4222-8222-222222222222'; -- prev week rain
  ev_aqi_pw  UUID := 'e9e9e9e9-3333-4333-8333-333333333333'; -- prev week AQI
  ev_restrict UUID := 'eaeaeaea-4444-4444-8444-444444444444'; -- restriction demo
  ev_live1 UUID := 'f0f0f0f0-1111-4111-8111-111111111111'; -- last-24h demo density (severity under 8 so insights stay green)
  ev_live2 UUID := 'f0f0f0f0-2222-4222-8222-222222222222';
  ev_live3 UUID := 'f0f0f0f0-3333-4333-8333-333333333333';
  ev_hyd   UUID := 'f0f0f0f0-5555-4555-8555-555555555555'; -- Hyderabad zone — paid claims for Roshan
  ev_noida_restrict UUID := 'f0f0f0f0-6666-4666-8666-666666666666'; -- Noida local restriction — paid claim for Alok
  ev_hyd_rain2 UUID := 'f0f0f0f0-7777-4777-8777-777777777777'; -- Hyderabad follow-up rain trigger — paid claim for Roshan

  -- Policy UUIDs: current week (pol1..pol8), previous week (pol_pw1..pol_pw8)
  pol1 UUID := 'f1f1f1f1-1111-4111-8111-111111111111';
  pol2 UUID := 'f2f2f2f2-2222-4222-8222-222222222222';
  pol3 UUID := 'f3f3f3f3-3333-4333-8333-333333333333';
  pol4 UUID := 'f4f4f4f4-4444-4444-8444-444444444444';
  pol5 UUID := 'f5f5f5f5-5555-4555-8555-555555555555';
  pol6 UUID := 'f6f6f6f6-6666-4666-8666-666666666666';
  pol7 UUID := 'f7f7f7f7-7777-4777-8777-777777777777';
  pol8 UUID := 'f8f8f8f8-8888-4888-8888-888888888888';
  pol_pw1 UUID := 'a1a1a1a1-1111-4111-8111-111111111111';
  pol_pw2 UUID := 'a2a2a2a2-2222-4222-8222-222222222222';
  pol_pw3 UUID := 'a3a3a3a3-3333-4333-8333-333333333333';
  pol_pw4 UUID := 'a4a4a4a4-4444-4444-8444-444444444444';
  pol_pw5 UUID := 'a5a5a5a5-5555-4555-8555-555555555555';
  pol_pw6 UUID := 'a6a6a6a6-6666-4666-8666-666666666666';
  pol_pw7 UUID := 'a7a7a7a7-7777-4777-8777-777777777777';
  pol_pw8 UUID := 'a8a8a8a8-8888-4888-8888-888888888888';
  -- Two weeks ago (for pricing timeline)
  pol_tw1 UUID := 'b1b1b1b1-1111-4111-8111-111111111111';
  pol_tw2 UUID := 'b2b2b2b2-2222-4222-8222-222222222222';
  pol_tw3 UUID := 'b3b3b3b3-3333-4333-8333-333333333333';
  pol_tw4 UUID := 'b4b4b4b4-4444-4444-8444-444444444444';
  pol_tw5 UUID := 'b5b5b5b5-5555-4555-8555-555555555555';
  pol_tw6 UUID := 'b6b6b6b6-6666-4666-8666-666666666666';
  pol_tw7 UUID := 'b7b7b7b7-7777-4777-8777-777777777777';
  pol_tw8 UUID := 'b8b8b8b8-8888-4888-8888-888888888888';

  -- Claim UUIDs: current week (cl1..cl4, cl_flag), previous week (cl_pw1, cl_pw2)
  cl1 UUID := 'c1010101-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  cl2 UUID := 'c2020202-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  cl3 UUID := 'c3030303-cccc-4ccc-8ccc-cccccccccccc';
  cl4 UUID := 'c4040404-dddd-4ddd-8ddd-dddddddddddd';
  cl_flag UUID := 'c5050505-eeee-4eee-8eee-eeeeeeeeeeee'; -- fraud: rapid triggers → admin rejected
  cl_fraud_gps UUID := 'c6060606-1111-4111-8111-111111111111'; -- fraud: GPS / zone mismatch → admin rejected
  cl_pw1 UUID := 'd1010101-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  cl_pw2 UUID := 'd2020202-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  cl_rejected UUID := 'd3030303-cccc-4ccc-8ccc-cccccccccccc'; -- reviewed demo hold → admin closed
  cl_r4_paid UUID := 'c7070707-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; -- r4 Alok: paid claim (zone restriction)
  cl_r5_paid UUID := 'c8080808-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; -- r5 Utkarsh: paid claim (heavy rain)
  cl_r6_paid UUID := 'c9090909-cccc-4ccc-8ccc-cccccccccccc'; -- r6 Roshan: paid claim (heavy rain)
  cl_r7_paid UUID := 'ca0a0a0a-dddd-4ddd-8ddd-dddddddddddd'; -- r7 Sahil: paid claim (rain alert)
  cl_r8_paid UUID := 'cb0b0b0b-eeee-4eee-8eee-eeeeeeeeeeee'; -- r8 Aniket: paid claim (traffic)
  cl_q_rapid UUID := 'cc0c0c0c-1111-4111-8111-111111111111'; -- pending fraud queue: rapid repeat trigger
  cl_q_gps UUID := 'cd0d0d0d-2222-4222-8222-222222222222'; -- pending fraud queue: GPS / zone mismatch
  cl_q_device UUID := 'ce0e0e0e-3333-4333-8333-333333333333'; -- pending fraud queue: device fingerprint change
  cl_q_weather UUID := 'cf0f0f0f-4444-4444-8444-444444444444'; -- pending fraud queue: weak weather corroboration

  -- Claim verification UUIDs (schema has no unique on claim_id/profile_id)
  cv1 UUID := 'aa111111-0000-4000-8000-000000000001';
  cv2 UUID := 'aa111111-0000-4000-8000-000000000002';
  cv3 UUID := 'aa111111-0000-4000-8000-000000000003';
  cv_pw1 UUID := 'aa111111-0000-4000-8000-000000000004';
  cv_pw2 UUID := 'aa111111-0000-4000-8000-000000000005';
  cv4 UUID := 'aa111111-0000-4000-8000-000000000006';
  cv5 UUID := 'aa111111-0000-4000-8000-000000000007';
  cv6 UUID := 'aa111111-0000-4000-8000-000000000008';
  cv7 UUID := 'aa111111-0000-4000-8000-000000000009';
  cv8 UUID := 'aa111111-0000-4000-8000-000000000010';
  cv_q_gps UUID := 'aa111111-0000-4000-8000-000000000011';
  cv_q_device UUID := 'aa111111-0000-4000-8000-000000000012';

  -- Premium recommendation UUIDs (schema has no unique on profile_id/week_start_date)
  pr1 UUID := 'bb222222-0000-4000-8000-000000000001';
  pr2 UUID := 'bb222222-0000-4000-8000-000000000002';
  pr3 UUID := 'bb222222-0000-4000-8000-000000000003';
  pr4 UUID := 'bb222222-0000-4000-8000-000000000004';
  pr5 UUID := 'bb222222-0000-4000-8000-000000000005';
  pr6 UUID := 'bb222222-0000-4000-8000-000000000006';
  pr7 UUID := 'bb222222-0000-4000-8000-000000000007';
  pr8 UUID := 'bb222222-0000-4000-8000-000000000008';

  -- Plan IDs (looked up)
  plan_basic    UUID;
  plan_standard UUID;
  plan_premium  UUID;

  -- Dynamic dates (ws set in BEGIN using IST)
  ws  DATE;
  we  DATE;
  pw_start DATE;
  pw_end   DATE;
  tw_start DATE;
  tw_end   DATE;

  -- Midnight IST at each week_start_date (ws_ist / pw_ist / tw_ist — not date::timestamptz = UTC midnight)
  ws_ist  TIMESTAMPTZ;
  pw_ist  TIMESTAMPTZ;
  tw_ist  TIMESTAMPTZ;

  hashed_pw TEXT;
BEGIN
  -- IST policy week (Mon–Sun): matches app helpers in lib/datetime/ist.ts
  ws := (date_trunc('week', (NOW() AT TIME ZONE 'Asia/Kolkata')::timestamp))::date;
  we := ws + 6;
  pw_start := ws - 7;
  pw_end := ws - 1;
  tw_start := ws - 14;
  tw_end := ws - 8;
  ws_ist := (ws::timestamp AT TIME ZONE 'Asia/Kolkata');
  pw_ist := (pw_start::timestamp AT TIME ZONE 'Asia/Kolkata');
  tw_ist := (tw_start::timestamp AT TIME ZONE 'Asia/Kolkata');
  hashed_pw := crypt('Demo@1234', gen_salt('bf'));

  -- ─── Clean up previous demo data (safe re-run) ───────────
  DELETE FROM automated_holds        WHERE profile_id IN (r1, r2, r3, r4, r5, r6, r7, r8);
  DELETE FROM claim_verifications    WHERE id IN (cv1, cv2, cv3, cv_pw1, cv_pw2, cv4, cv5, cv6, cv7, cv8, cv_q_gps, cv_q_device);
  DELETE FROM rider_notifications    WHERE profile_id IN (r1, r2, r3, r4, r5, r6, r7, r8);
  DELETE FROM payout_ledger          WHERE profile_id IN (r1, r2, r3, r4, r5, r6, r7, r8);
  DELETE FROM parametric_claims      WHERE id IN (cl1, cl2, cl3, cl4, cl_flag, cl_fraud_gps, cl_pw1, cl_pw2, cl_rejected, cl_r4_paid, cl_r5_paid, cl_r6_paid, cl_r7_paid, cl_r8_paid, cl_q_rapid, cl_q_gps, cl_q_device, cl_q_weather);
  DELETE FROM payment_transactions   WHERE profile_id IN (r1, r2, r3, r4, r5, r6, r7, r8);
  DELETE FROM weekly_policies        WHERE id IN (pol1, pol2, pol3, pol4, pol5, pol6, pol7, pol8, pol_pw1, pol_pw2, pol_pw3, pol_pw4, pol_pw5, pol_pw6, pol_pw7, pol_pw8, pol_tw1, pol_tw2, pol_tw3, pol_tw4, pol_tw5, pol_tw6, pol_tw7, pol_tw8);
  DELETE FROM premium_recommendations WHERE id IN (pr1, pr2, pr3, pr4, pr5, pr6, pr7, pr8);
  DELETE FROM rider_delivery_reports WHERE profile_id IN (r1, r2, r3, r4, r5, r6, r7, r8);
  DELETE FROM live_disruption_events  WHERE id IN (ev_heat, ev_rain_m, ev_aqi, ev_traffic, ev_curfew, ev_rain_c, ev_heat2, ev_rain_pw, ev_aqi_pw, ev_restrict, ev_live1, ev_live2, ev_live3, ev_hyd, ev_noida_restrict, ev_hyd_rain2);
  -- Pricing snapshots (Plans & Pricing performance widget)
  DELETE FROM plan_pricing_snapshots WHERE week_start_date BETWEEN (ws - 77) AND ws;
  DELETE FROM system_logs             WHERE (event_type IN ('adjudicator_run', 'adjudicator_demo') AND (metadata->>'run_id') = 'demo-seed')
    OR (metadata->>'seed') = 'true';
  DELETE FROM weekly_policies        WHERE profile_id IN (r1, r2, r3, r4, r5, r6, r7, r8);
  DELETE FROM profiles               WHERE id IN (r1, r2, r3, r4, r5, r6, r7, r8);
  DELETE FROM profiles               WHERE id IN (admin1);

  -- ─── Ensure plan packages exist (weekly loss-of-income caps; parametric triggers only) ──
  INSERT INTO plan_packages (slug, name, description, weekly_premium_inr, payout_per_claim_inr, max_claims_per_week, sort_order)
  VALUES
    ('basic',    'Basic',    'Weekly cover for lost delivery income when your zone is disrupted — capped parametric payouts per week.',    49,  300,  1, 1),
    ('standard', 'Standard', 'Higher per-claim replacement for income lost to weather, closures, or gridlock — best fit for most riders.',  99,  700,  2, 2),
    ('premium',  'Premium',  'Maximum weekly protection for high-disruption zones; income replacement only (not medical or vehicle damage).', 199, 1500, 3, 3)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    weekly_premium_inr = EXCLUDED.weekly_premium_inr,
    payout_per_claim_inr = EXCLUDED.payout_per_claim_inr,
    max_claims_per_week = EXCLUDED.max_claims_per_week,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

  SELECT id INTO plan_basic    FROM plan_packages WHERE slug = 'basic';
  SELECT id INTO plan_standard FROM plan_packages WHERE slug = 'standard';
  SELECT id INTO plan_premium  FROM plan_packages WHERE slug = 'premium';

  -- ─── App config (safe defaults for demos) ─────────────────
  INSERT INTO app_config (key, value)
  VALUES
    ('demo_seed', 'true'),
    ('adjudicator_interval_minutes', '15'),
    ('pricing_basis', 'weekly')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  -- ─── Auth users (demo accounts) ──────────────────────────
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    (r1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'saumy@demo.com',    hashed_pw, NOW() - interval '30 days', NOW() - interval '30 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Saumy Bhardwaj"}', false, '', '', '', ''),
    (r2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'varun@demo.com',    hashed_pw, NOW() - interval '28 days', NOW() - interval '28 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Varun Prakash"}',  false, '', '', '', ''),
    (r3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aditya@demo.com',   hashed_pw, NOW() - interval '25 days', NOW() - interval '25 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aditya Sinha"}',   false, '', '', '', ''),
    (r4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alok@demo.com',     hashed_pw, NOW() - interval '24 days', NOW() - interval '24 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alok Kumar"}',     false, '', '', '', ''),
    (r5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'utkarsh@demo.com',  hashed_pw, NOW() - interval '22 days', NOW() - interval '22 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Utkarsh Singh"}', false, '', '', '', ''),
    (r6, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'roshan@demo.com',   hashed_pw, NOW() - interval '20 days', NOW() - interval '20 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Roshan Kumar"}',   false, '', '', '', ''),
    (r7, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sahil@demo.com',    hashed_pw, NOW() - interval '18 days', NOW() - interval '18 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sahil Ali"}',     false, '', '', '', ''),
    (r8, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aniket@demo.com',   hashed_pw, NOW() - interval '16 days', NOW() - interval '16 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aniket Raj"}',    false, '', '', '', ''),
    (admin1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.demo@oasis.app', hashed_pw, NOW() - interval '60 days', NOW() - interval '60 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Oasis Admin"}', false, '', '', '', '')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (r1, r1, jsonb_build_object('sub', r1::text, 'email', 'saumy@demo.com'),   'email', r1::text, NOW(), NOW() - interval '30 days', NOW()),
    (r2, r2, jsonb_build_object('sub', r2::text, 'email', 'varun@demo.com'),   'email', r2::text, NOW(), NOW() - interval '28 days', NOW()),
    (r3, r3, jsonb_build_object('sub', r3::text, 'email', 'aditya@demo.com'),  'email', r3::text, NOW(), NOW() - interval '25 days', NOW()),
    (r4, r4, jsonb_build_object('sub', r4::text, 'email', 'alok@demo.com'),    'email', r4::text, NOW(), NOW() - interval '24 days', NOW()),
    (r5, r5, jsonb_build_object('sub', r5::text, 'email', 'utkarsh@demo.com'), 'email', r5::text, NOW(), NOW() - interval '22 days', NOW()),
    (r6, r6, jsonb_build_object('sub', r6::text, 'email', 'roshan@demo.com'),  'email', r6::text, NOW(), NOW() - interval '20 days', NOW()),
    (r7, r7, jsonb_build_object('sub', r7::text, 'email', 'sahil@demo.com'),   'email', r7::text, NOW(), NOW() - interval '18 days', NOW()),
    (r8, r8, jsonb_build_object('sub', r8::text, 'email', 'aniket@demo.com'),  'email', r8::text, NOW(), NOW() - interval '16 days', NOW()),
    (admin1, admin1, jsonb_build_object('sub', admin1::text, 'email', 'admin.demo@oasis.app'), 'email', admin1::text, NOW(), NOW() - interval '60 days', NOW())
  ON CONFLICT (id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    provider = EXCLUDED.provider,
    provider_id = EXCLUDED.provider_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = NOW();

  -- ─── Profiles ─────────────────────────────────────────────
  INSERT INTO profiles (
    id, full_name, phone_number, platform, payment_routing_id,
    zone_latitude, zone_longitude, role,
    government_id_url, government_id_verified, government_id_verification_result,
    face_photo_url, face_verified, primary_zone_geofence, preferred_language,
    razorpay_customer_id, razorpay_subscription_id, auto_renew_enabled
  )
  VALUES
    (r1, 'Saumy Bhardwaj', '9876543210', 'zepto',   'saumy@upi',
     12.9352, 77.6245, 'rider', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/government-id', true, '{"verified":true,"reason":"Clear Aadhaar-style demo document; name matched profile."}', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/face-verification', true, '{"type":"circle","lat":12.9352,"lng":77.6245,"radius_km":5,"zone_name":"Koramangala, Bengaluru"}', 'en', 'cust_demo_saumy', 'sub_demo_saumy_weekly', true),
    (r2, 'Varun Prakash',  '9876543210', 'blinkit', 'varun@upi',
     19.1136, 72.8697, 'rider', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e/government-id', true, '{"verified":true,"reason":"PAN-style demo document verified; name and face check passed."}', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e/face-verification', true, '{"type":"circle","lat":19.1136,"lng":72.8697,"radius_km":5,"zone_name":"Andheri West, Mumbai"}', 'hi', 'cust_demo_varun', 'sub_demo_varun_weekly', true),
    (r3, 'Aditya Sinha',   '9876543210', 'zepto',   'aditya@upi',
     28.6315, 77.2167, 'rider', 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f/government-id', true, '{"verified":true,"reason":"Demo government ID is readable and consistent with rider profile."}', 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f/face-verification', true, '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":5,"zone_name":"Connaught Place, New Delhi"}', 'en', 'cust_demo_aditya', 'sub_demo_aditya_weekly', true),
    (r4, 'Alok Kumar',     '9876543210', 'blinkit', 'alok@upi',
     28.5355, 77.3910, 'rider', 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a/government-id', true, '{"verified":true,"reason":"Document and liveness checks completed for demo onboarding."}', 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a/face-verification', true, '{"type":"circle","lat":28.5355,"lng":77.3910,"radius_km":5,"zone_name":"Sector 62, Noida"}', 'hi', 'cust_demo_alok', 'sub_demo_alok_weekly', true),
    (r5, 'Utkarsh Singh',  '9876543210', 'zepto',   'utkarsh@upi',
     18.5204, 73.8567, 'rider', 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b/government-id', true, '{"verified":true,"reason":"Demo ID verified; profile is ready for weekly coverage."}', 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b/face-verification', true, '{"type":"circle","lat":18.5204,"lng":73.8567,"radius_km":5,"zone_name":"Shivajinagar, Pune"}', 'en', 'cust_demo_utkarsh', 'sub_demo_utkarsh_weekly', true),
    (r6, 'Roshan Kumar',   '9876543210', 'blinkit', 'roshan@upi',
     17.4483, 78.3915, 'rider', 'f6a7b8c9-d0e1-4f2a-8b3c-5d6e7f8a9b0c/government-id', true, '{"verified":true,"reason":"KYC details are consistent and face verification passed."}', 'f6a7b8c9-d0e1-4f2a-8b3c-5d6e7f8a9b0c/face-verification', true, '{"type":"circle","lat":17.4483,"lng":78.3915,"radius_km":5,"zone_name":"HITEC City, Hyderabad"}', 'te', 'cust_demo_roshan', 'sub_demo_roshan_weekly', true),
    (r7, 'Sahil Ali',      '9876543210', 'zepto',   'sahil@upi',
     22.5726, 88.3639, 'rider', '07b8c9d0-e1f2-4a3b-8c5d-6e7f8a9b0c1d/government-id', true, '{"verified":true,"reason":"Demo government ID and profile name matched successfully."}', '07b8c9d0-e1f2-4a3b-8c5d-6e7f8a9b0c1d/face-verification', true, '{"type":"circle","lat":22.5726,"lng":88.3639,"radius_km":5,"zone_name":"Park Street, Kolkata"}', 'en', 'cust_demo_sahil', 'sub_demo_sahil_weekly', true),
    (r8, 'Aniket Raj',     '9876543210', 'blinkit', 'aniket@upi',
     28.4595, 77.0266, 'rider', '18c9d0e1-f2a3-4b4c-9d6e-7f8a9b0c1d2e/government-id', true, '{"verified":true,"reason":"Clean demo KYC record; liveness and document checks passed."}', '18c9d0e1-f2a3-4b4c-9d6e-7f8a9b0c1d2e/face-verification', true, '{"type":"circle","lat":28.4595,"lng":77.0266,"radius_km":5,"zone_name":"Cyber City, Gurugram"}', 'hi', 'cust_demo_aniket', 'sub_demo_aniket_weekly', true),
    (admin1, 'Oasis Admin', '+910000000000', NULL, NULL,
     NULL, NULL, 'admin', NULL, false, NULL, NULL, false, NULL, 'en', NULL, NULL, false)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    platform = EXCLUDED.platform,
    payment_routing_id = EXCLUDED.payment_routing_id,
    zone_latitude = EXCLUDED.zone_latitude,
    zone_longitude = EXCLUDED.zone_longitude,
    role = EXCLUDED.role,
    government_id_url = EXCLUDED.government_id_url,
    government_id_verified = EXCLUDED.government_id_verified,
    government_id_verification_result = EXCLUDED.government_id_verification_result,
    face_photo_url = EXCLUDED.face_photo_url,
    face_verified = EXCLUDED.face_verified,
    primary_zone_geofence = EXCLUDED.primary_zone_geofence,
    preferred_language = EXCLUDED.preferred_language,
    razorpay_customer_id = EXCLUDED.razorpay_customer_id,
    razorpay_subscription_id = EXCLUDED.razorpay_subscription_id,
    auto_renew_enabled = EXCLUDED.auto_renew_enabled;

  -- ─── Disruption Events (current + previous week) ─────────
  INSERT INTO live_disruption_events (id, event_type, event_subtype, severity_score, geofence_polygon, verified_by_llm, raw_api_data, created_at)
  VALUES
    (ev_heat, 'weather', 'extreme_heat', 8.5,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":15}',
     false, '{"trigger":"extreme_heat","source":"tomorrow_io","temperature":45.2,"feels_like":48.1}',
     NOW() - interval '2 days'),
    (ev_rain_m, 'weather', 'heavy_rain', 9.0,
     '{"type":"circle","lat":19.1136,"lng":72.8697,"radius_km":15}',
     false, '{"trigger":"heavy_rain","source":"tomorrow_io","precip_mm":12.5,"humidity":95}',
     NOW() - interval '1 day'),
    (ev_aqi, 'weather', 'severe_aqi', 7.5,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":20}',
     false, '{"trigger":"severe_aqi","source":"waqi_ground_station","aqi":312,"adaptive_threshold":201}',
     NOW() - interval '3 days'),
    (ev_traffic, 'traffic', 'traffic_gridlock', 8.0,
     '{"type":"circle","lat":12.9352,"lng":77.6245,"radius_km":15}',
     true, '{"trigger":"traffic_gridlock","source":"tomtom_traffic","sample_points":5,"congested_points":4,"avg_ratio":0.18}',
     NOW() - interval '5 hours'),
    (ev_curfew, 'social', 'zone_curfew', 9.0,
     '{"type":"circle","lat":28.5355,"lng":77.3910,"radius_km":20}',
     true, '{"trigger":"zone_curfew","source":"newsdata_openrouter","articles":[{"title":"Temporary market closure announced near Noida Sector 62"}]}',
     NOW() - interval '4 days'),
    (ev_rain_c, 'weather', 'heavy_rain', 8.0,
     '{"type":"circle","lat":18.5204,"lng":73.8567,"radius_km":15}',
     false, '{"trigger":"heavy_rain","source":"tomorrow_io","precip_mm":8.3,"humidity":92,"zone":"Shivajinagar, Pune"}',
     NOW() - interval '3 hours'),
    (ev_heat2, 'weather', 'extreme_heat', 7.0,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":15}',
     false, '{"trigger":"extreme_heat","source":"tomorrow_io","temperature":43.8}',
     NOW() - interval '9 days'),
    (ev_rain_pw, 'weather', 'heavy_rain', 8.5,
     '{"type":"circle","lat":19.1136,"lng":72.8697,"radius_km":15}',
     false, '{"trigger":"heavy_rain","source":"tomorrow_io","precip_mm":10.2}',
     pw_ist + interval '4 days'),
    (ev_aqi_pw, 'weather', 'severe_aqi', 7.0,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":20}',
     false, '{"trigger":"severe_aqi","source":"waqi_ground_station","aqi":288}',
     pw_ist + interval '2 days'),
    (ev_restrict, 'social', 'local_restriction', 8.2,
     '{"type":"circle","lat":12.9352,"lng":77.6245,"radius_km":12}',
     true, '{"trigger":"local_restriction","source":"newsdata_openrouter","summary":"Local restriction announced in zone"}',
     NOW() - interval '12 hours'),
    (ev_live1, 'weather', 'heavy_rain', 7.8,
     '{"type":"circle","lat":18.52,"lng":73.86,"radius_km":10}',
     false, '{"trigger":"heavy_rain","source":"tomorrow_io","precip_mm":6.2,"demo":"last24h","zone":"Pune central"}',
     NOW() - interval '5 hours'),
    (ev_live2, 'weather', 'heavy_rain', 7.5,
     '{"type":"circle","lat":22.57,"lng":88.36,"radius_km":8}',
     false, '{"trigger":"heavy_rain","source":"tomorrow_io","demo":"last24h","zone":"Park Street, Kolkata"}',
     NOW() - interval '14 hours'),
    (ev_live3, 'traffic', 'traffic_gridlock', 7.6,
     '{"type":"circle","lat":28.46,"lng":77.03,"radius_km":14}',
     true, '{"trigger":"traffic_gridlock","source":"tomtom_traffic","demo":"last24h","zone":"Cyber City, Gurugram"}',
     NOW() - interval '2 hours'),
    (ev_hyd, 'weather', 'heavy_rain', 7.8,
     '{"type":"circle","lat":17.4483,"lng":78.3915,"radius_km":12}',
     false, '{"trigger":"heavy_rain","source":"tomorrow_io","precip_mm":7.1,"seed":"wallet_demo_roshan"}',
     NOW() - interval '8 hours'),
    (ev_noida_restrict, 'social', 'local_restriction', 7.9,
     '{"type":"circle","lat":28.5355,"lng":77.3910,"radius_km":12}',
     true, '{"trigger":"local_restriction","source":"newsdata_openrouter","summary":"Temporary access limits near Sector 62 commercial lane"}',
     NOW() - interval '7 hours'),
    (ev_hyd_rain2, 'weather', 'heavy_rain', 7.4,
     '{"type":"circle","lat":17.4483,"lng":78.3915,"radius_km":10}',
     false, '{"trigger":"heavy_rain","source":"tomorrow_io","precip_mm":6.4,"seed":"second_hyderabad_trigger"}',
     NOW() - interval '8 hours')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Weekly Policies: current + previous + two weeks ago ─
  -- Current IST week: eight riders, total weekly premium ₹992 (paid).
  INSERT INTO weekly_policies (id, profile_id, plan_id, week_start_date, week_end_date, weekly_premium_inr, is_active, payment_status, created_at)
  VALUES
    (pol1, r1, plan_standard, ws, we,  99, true,  'paid', ws_ist),
    (pol2, r2, plan_premium,  ws, we, 199, true,  'paid', ws_ist),
    (pol3, r3, plan_basic,    ws, we,  49, true,  'paid', ws_ist),
    (pol4, r4, plan_standard, ws, we,  99, true,  'paid', ws_ist),
    (pol5, r5, plan_premium,  ws, we, 199, true,  'paid', ws_ist),
    (pol6, r6, plan_standard, ws, we,  99, true,  'paid', ws_ist),
    (pol7, r7, plan_basic,    ws, we,  49, true,  'paid', ws_ist),
    (pol8, r8, plan_premium,  ws, we, 199, true,  'paid', ws_ist),
    (pol_pw1, r1, plan_standard, pw_start, pw_end,  99, false, 'paid', pw_ist),
    (pol_pw2, r2, plan_premium,  pw_start, pw_end, 199, false, 'paid', pw_ist),
    (pol_pw3, r3, plan_basic,    pw_start, pw_end,  49, false, 'paid', pw_ist),
    (pol_pw4, r4, plan_standard, pw_start, pw_end,  99, false, 'paid', pw_ist),
    (pol_pw5, r5, plan_premium,  pw_start, pw_end, 199, false, 'paid', pw_ist),
    (pol_pw6, r6, plan_standard, pw_start, pw_end,  99, false, 'paid', pw_ist),
    (pol_pw7, r7, plan_basic,    pw_start, pw_end,  49, false, 'paid', pw_ist),
    (pol_pw8, r8, plan_premium,  pw_start, pw_end, 199, false, 'paid', pw_ist),
    (pol_tw1, r1, plan_basic,    tw_start, tw_end,  52, false, 'paid', tw_ist),
    (pol_tw2, r2, plan_standard, tw_start, tw_end, 105, false, 'paid', tw_ist),
    (pol_tw3, r3, plan_basic,    tw_start, tw_end,  52, false, 'paid', tw_ist),
    (pol_tw4, r4, plan_standard, tw_start, tw_end, 105, false, 'paid', tw_ist),
    (pol_tw5, r5, plan_premium,  tw_start, tw_end, 210, false, 'paid', tw_ist),
    (pol_tw6, r6, plan_standard, tw_start, tw_end, 105, false, 'paid', tw_ist),
    (pol_tw7, r7, plan_basic,    tw_start, tw_end,  52, false, 'paid', tw_ist),
    (pol_tw8, r8, plan_premium,  tw_start, tw_end, 210, false, 'paid', tw_ist)
  ON CONFLICT (id) DO NOTHING;

  -- ─── Plan pricing snapshots (last 12 weeks) ───────────────
  -- These drive the admin pricing timeline + forecast chart. Keep movements modest:
  -- enough variance to look real, but stable for a professional weekly product demo.
  INSERT INTO plan_pricing_snapshots (week_start_date, plan_id, weekly_premium_inr, source)
  VALUES
    (ws - 77,  plan_basic,     46, 'manual'),
    (ws - 77,  plan_standard,  92, 'manual'),
    (ws - 77,  plan_premium,  184, 'manual'),
    (ws - 70,  plan_basic,     47, 'manual'),
    (ws - 70,  plan_standard,  94, 'manual'),
    (ws - 70,  plan_premium,  188, 'manual'),
    (ws - 63,  plan_basic,     47, 'manual'),
    (ws - 63,  plan_standard,  95, 'manual'),
    (ws - 63,  plan_premium,  190, 'manual'),
    (ws - 56,  plan_basic,     48, 'manual'),
    (ws - 56,  plan_standard,  96, 'manual'),
    (ws - 56,  plan_premium,  192, 'manual'),
    (ws - 49,  plan_basic,     48, 'manual'),
    (ws - 49,  plan_standard,  97, 'manual'),
    (ws - 49,  plan_premium,  194, 'manual'),
    (ws - 42,  plan_basic,     49, 'manual'),
    (ws - 42,  plan_standard,  98, 'manual'),
    (ws - 42,  plan_premium,  196, 'manual'),
    (ws - 35,  plan_basic,     50, 'manual'),
    (ws - 35,  plan_standard, 101, 'manual'),
    (ws - 35,  plan_premium,  202, 'manual'),
    (ws - 28,  plan_basic,     51, 'manual'),
    (ws - 28,  plan_standard, 103, 'manual'),
    (ws - 28,  plan_premium,  206, 'manual'),
    (ws - 21,  plan_basic,     50, 'manual'),
    (ws - 21,  plan_standard, 100, 'manual'),
    (ws - 21,  plan_premium,  201, 'manual'),
    (tw_start, plan_basic,     52, 'manual'),
    (tw_start, plan_standard, 105, 'manual'),
    (tw_start, plan_premium,  210, 'manual'),
    (pw_start, plan_basic,     47, 'manual'),
    (pw_start, plan_standard,  95, 'manual'),
    (pw_start, plan_premium,  189, 'manual'),
    (ws,       plan_basic,     49, 'manual'),
    (ws,       plan_standard,  99, 'manual'),
    (ws,       plan_premium,  199, 'manual')
  ON CONFLICT (week_start_date, plan_id) DO UPDATE SET
    weekly_premium_inr = EXCLUDED.weekly_premium_inr,
    source = EXCLUDED.source;

  -- ─── Parametric Claims ───────────────────────────────────
  -- Paid samples + cl4 (pending location verify) + one reviewed hold sample.
  -- Payout amounts respect plan caps (Basic ₹300 / Standard ₹700 / Premium ₹1500 per claim).
  INSERT INTO parametric_claims (id, policy_id, disruption_event_id, payout_amount_inr, status, is_flagged, flag_reason, gateway_transaction_id, created_at)
  VALUES
    (cl1, pol1, ev_traffic, 320, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_1',
     NOW() - interval '5 hours'),
    (cl2, pol2, ev_rain_m, 480, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_2',
     NOW() - interval '22 hours'),
    (cl3, pol3, ev_heat, 210, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_3',
     NOW() - interval '46 hours'),
    (cl4, pol4, ev_curfew, 0, 'pending_verification', false, NULL, NULL,
     NOW() - interval '10 hours'),
    (cl_flag, pol5, ev_rain_c, 450, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_5',
     NOW() - interval '3 hours'),
    (cl_fraud_gps, pol6, ev_hyd, 350, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_6',
     NOW() - interval '2 hours'),
    (cl_pw1, pol_pw2, ev_rain_pw, 250, 'paid', false, NULL,
     'oasis_verify_pw_' || extract(epoch from NOW())::bigint || '_1',
     pw_ist + interval '5 days'),
    (cl_pw2, pol_pw3, ev_aqi_pw, 169, 'paid', false, NULL,
     'oasis_verify_pw_' || extract(epoch from NOW())::bigint || '_2',
     pw_ist + interval '3 days'),
    (cl_rejected, pol7, ev_restrict, 0, 'triggered', true,
     'Demo review sample: delivery proof did not match the insured zone and was closed without payout',
     NULL,
     NOW() - interval '9 hours'),
    (cl_r4_paid, pol4, ev_noida_restrict, 300, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_r4',
     NOW() - interval '7 hours'),
    (cl_r5_paid, pol5, ev_live1, 275, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_r5',
     NOW() - interval '90 minutes'),
    (cl_r6_paid, pol6, ev_hyd_rain2, 240, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_r6',
     NOW() - interval '75 minutes'),
    (cl_r7_paid, pol7, ev_live2, 180, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_r7',
     NOW() - interval '55 minutes'),
    (cl_r8_paid, pol8, ev_live3, 410, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_r8',
     NOW() - interval '35 minutes'),
    (cl_q_rapid, pol1, ev_live1, 0, 'pending_verification', true,
     'Rapid repeat signal: multiple qualifying disruption triggers observed on the same weekly policy within a short window',
     NULL,
     NOW() - interval '25 minutes'),
    (cl_q_gps, pol2, ev_live2, 0, 'pending_verification', true,
     'GPS / zone mismatch: submitted delivery location is outside the insured Andheri West geofence',
     NULL,
     NOW() - interval '32 minutes'),
    (cl_q_device, pol8, ev_aqi, 0, 'triggered', true,
     'Device fingerprint changed immediately before claim verification; manual review required before payout',
     NULL,
     NOW() - interval '48 minutes'),
    (cl_q_weather, pol5, ev_restrict, 0, 'triggered', true,
     'Weak external corroboration: rider self-report conflicts with trusted weather and local restriction signals',
     NULL,
     NOW() - interval '64 minutes')
  ON CONFLICT (id) DO NOTHING;

  UPDATE parametric_claims
    SET fraud_risk_score = CASE id
          WHEN cl_q_rapid THEN 88
          WHEN cl_q_gps THEN 82
          WHEN cl_q_device THEN 76
          WHEN cl_q_weather THEN 69
          ELSE fraud_risk_score
        END,
        fraud_risk_tier = CASE id
          WHEN cl_q_weather THEN 'elevated'
          ELSE 'high'
        END,
        fraud_risk_breakdown = CASE id
          WHEN cl_q_rapid THEN jsonb_build_object('rapid_repeat', 42, 'same_policy_window', 28, 'payout_velocity', 18)
          WHEN cl_q_gps THEN jsonb_build_object('geofence_distance', 38, 'gps_accuracy', 24, 'zone_history', 20)
          WHEN cl_q_device THEN jsonb_build_object('device_change', 35, 'session_age', 18, 'verification_retry', 23)
          WHEN cl_q_weather THEN jsonb_build_object('corroboration_gap', 31, 'report_text_risk', 20, 'external_signal_strength', 18)
          ELSE fraud_risk_breakdown
        END,
        admin_review_status = NULL,
        reviewed_by = NULL,
        reviewed_at = NULL,
        updated_at = NOW()
    WHERE id IN (cl_q_rapid, cl_q_gps, cl_q_device, cl_q_weather);

  -- A single reviewed hold keeps the admin review page populated without making the demo look negative.
  UPDATE parametric_claims
    SET admin_review_status = 'rejected',
        reviewed_by = 'admin.demo@oasis.app',
        reviewed_at = NOW() - interval '8 hours',
        updated_at = NOW()
    WHERE id IN (cl_rejected);

  INSERT INTO automated_holds (
    stage, claim_id, policy_id, profile_id, disruption_event_id,
    hold_type, reason, reason_trail, status, resolved_at, resolved_by, created_at
  )
  VALUES
    (
      'pre_payout', cl_rejected, pol7, r7, ev_restrict,
      'zone_mismatch',
      'Resolved demo hold: delivery proof was outside Sahil Ali''s insured Park Street zone.',
      jsonb_build_array(
        jsonb_build_object('check', 'geofence', 'result', 'outside_contract_zone', 'distance_km', 3.4),
        jsonb_build_object('check', 'admin_review', 'result', 'closed_without_payout')
      ),
      'rejected', NOW() - interval '8 hours', 'admin.demo@oasis.app', NOW() - interval '9 hours'
    ),
    (
      'pre_payout', cl_q_rapid, pol1, r1, ev_live1,
      'rapid_repeat',
      'Pending review: Saumy has two same-week disruption matches close together; verify delivery availability before payout.',
      jsonb_build_array(
        jsonb_build_object('check', 'rapid_claims', 'result', 'threshold_exceeded', 'window_hours', 24),
        jsonb_build_object('check', 'policy_cap', 'result', 'within_weekly_cap')
      ),
      'held', NULL, NULL, NOW() - interval '24 minutes'
    ),
    (
      'pre_payout', cl_q_gps, pol2, r2, ev_live2,
      'zone_mismatch',
      'Pending review: Varun''s submitted GPS point is outside the contracted Andheri West delivery zone.',
      jsonb_build_array(
        jsonb_build_object('check', 'geofence', 'result', 'outside_contract_zone', 'distance_km', 4.1),
        jsonb_build_object('check', 'gps_accuracy', 'result', 'low_confidence', 'accuracy_m', 96)
      ),
      'held', NULL, NULL, NOW() - interval '31 minutes'
    ),
    (
      'pre_payout', cl_q_device, pol8, r8, ev_aqi,
      'device_fingerprint',
      'Pending review: Aniket switched to a new device immediately before verification.',
      jsonb_build_array(
        jsonb_build_object('check', 'device_fingerprint', 'result', 'new_device'),
        jsonb_build_object('check', 'session_age', 'result', 'fresh_session', 'minutes', 7)
      ),
      'held', NULL, NULL, NOW() - interval '47 minutes'
    ),
    (
      'pre_claim', cl_q_weather, pol5, r5, ev_restrict,
      'weak_corroboration',
      'Pending review: Utkarsh report needs manual confirmation because external disruption signals are weak for the insured Pune zone.',
      jsonb_build_array(
        jsonb_build_object('check', 'weather_corroboration', 'result', 'below_threshold'),
        jsonb_build_object('check', 'news_corroboration', 'result', 'no_local_match')
      ),
      'held', NULL, NULL, NOW() - interval '63 minutes'
    );

  -- ─── Claim Verifications (for paid claims) ───────────────
  INSERT INTO claim_verifications (id, claim_id, profile_id, verified_lat, verified_lng, verified_at, status, declaration_confirmed, declaration_at)
  VALUES
    (cv1, cl1, r1, 12.9360, 77.6250, NOW() - interval '4 hours 50 minutes', 'inside_geofence', true, NOW() - interval '4 hours 50 minutes'),
    (cv2, cl2, r2, 19.1140, 72.8700, NOW() - interval '21 hours', 'inside_geofence', true, NOW() - interval '21 hours'),
    (cv3, cl3, r3, 28.6320, 77.2170, NOW() - interval '45 hours', 'inside_geofence', true, NOW() - interval '45 hours'),
    (cv_pw1, cl_pw1, r2, 19.1140, 72.8700, pw_ist + interval '5 days 1 hour', 'inside_geofence', true, pw_ist + interval '5 days 1 hour'),
    (cv_pw2, cl_pw2, r3, 28.6320, 77.2170, pw_ist + interval '3 days 2 hours', 'inside_geofence', true, pw_ist + interval '3 days 2 hours'),
    (cv4, cl_r4_paid, r4, 28.5360, 77.3920, NOW() - interval '6 hours 55 minutes', 'inside_geofence', true, NOW() - interval '6 hours 55 minutes'),
    (cv5, cl_r5_paid, r5, 18.5210, 73.8570, NOW() - interval '1 hour 25 minutes', 'inside_geofence', true, NOW() - interval '1 hour 25 minutes'),
    (cv6, cl_r6_paid, r6, 17.4490, 78.3920, NOW() - interval '1 hour 10 minutes', 'inside_geofence', true, NOW() - interval '1 hour 10 minutes'),
    (cv7, cl_r7_paid, r7, 22.5730, 88.3642, NOW() - interval '50 minutes', 'inside_geofence', true, NOW() - interval '50 minutes'),
    (cv8, cl_r8_paid, r8, 28.4600, 77.0270, NOW() - interval '30 minutes', 'inside_geofence', true, NOW() - interval '30 minutes'),
    (cv_q_gps, cl_q_gps, r2, 19.1710, 72.8580, NOW() - interval '30 minutes', 'outside_geofence', true, NOW() - interval '30 minutes'),
    (cv_q_device, cl_q_device, r8, 28.4700, 77.0420, NOW() - interval '46 minutes', 'inside_geofence', true, NOW() - interval '46 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Payout Ledger (for paid claims only) ─────────────────
  INSERT INTO payout_ledger (claim_id, profile_id, amount_inr, payout_method, status, mock_upi_ref, initiated_at, completed_at, metadata)
  VALUES
    (cl1, r1, 320, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R1001', NOW() - interval '4 hours 48 minutes', NOW() - interval '4 hours 47 minutes', '{"source":"auto_adjudicator"}'),
    (cl2, r2, 480, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R2001', NOW() - interval '20 hours 55 minutes', NOW() - interval '20 hours 54 minutes', '{"source":"auto_adjudicator"}'),
    (cl3, r3, 210, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R3001', NOW() - interval '44 hours 55 minutes', NOW() - interval '44 hours 54 minutes', '{"source":"auto_adjudicator"}'),
    (cl_flag, r5, 450, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R5001', NOW() - interval '2 hours 55 minutes', NOW() - interval '2 hours 54 minutes', '{"source":"auto_adjudicator"}'),
    (cl_fraud_gps, r6, 350, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R6001', NOW() - interval '1 hour 55 minutes', NOW() - interval '1 hour 54 minutes', '{"source":"auto_adjudicator"}'),
    (cl_pw1, r2, 250, 'upi_instant', 'completed', 'UPI/OAS/PW/R2001', pw_ist + interval '5 days', pw_ist + interval '5 days 30 minutes', '{"source":"auto_adjudicator"}'),
    (cl_pw2, r3, 169, 'upi_instant', 'completed', 'UPI/OAS/PW/R3001', pw_ist + interval '3 days 1 hour', pw_ist + interval '3 days 2 hours', '{"source":"auto_adjudicator"}'),
    (cl_r4_paid, r4, 300, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R4001', NOW() - interval '6 hours 50 minutes', NOW() - interval '6 hours 49 minutes', '{"source":"auto_adjudicator"}'),
    (cl_r5_paid, r5, 275, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R5002', NOW() - interval '1 hour 20 minutes', NOW() - interval '1 hour 19 minutes', '{"source":"auto_adjudicator"}'),
    (cl_r6_paid, r6, 240, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R6002', NOW() - interval '1 hour 8 minutes', NOW() - interval '1 hour 7 minutes', '{"source":"auto_adjudicator"}'),
    (cl_r7_paid, r7, 180, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R7001', NOW() - interval '48 minutes', NOW() - interval '47 minutes', '{"source":"auto_adjudicator"}'),
    (cl_r8_paid, r8, 410, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R8001', NOW() - interval '28 minutes', NOW() - interval '27 minutes', '{"source":"auto_adjudicator"}');

  -- ─── Premium Recommendations (next week) ─────────────────
  INSERT INTO premium_recommendations (
    id, profile_id, week_start_date, recommended_premium_inr,
    historical_event_count, forecast_risk_factor, risk_factors, created_at
  )
  VALUES
    (pr1, r1, ws + 7,  89, 3, 0.35, jsonb_build_object('forecast_risk', 0.35, 'historical_events', 3, 'social_risk', 0.18, 'claim_count_4w', 1), NOW()),
    (pr2, r2, ws + 7, 159, 5, 0.62, jsonb_build_object('forecast_risk', 0.62, 'historical_events', 5, 'social_risk', 0.31, 'claim_count_4w', 2), NOW()),
    (pr3, r3, ws + 7,  69, 4, 0.55, jsonb_build_object('forecast_risk', 0.55, 'historical_events', 4, 'social_risk', 0.22, 'claim_count_4w', 2), NOW()),
    (pr4, r4, ws + 7,  79, 2, 0.28, jsonb_build_object('forecast_risk', 0.28, 'historical_events', 2, 'social_risk', 0.21, 'claim_count_4w', 1), NOW()),
    (pr5, r5, ws + 7, 139, 3, 0.48, jsonb_build_object('forecast_risk', 0.48, 'historical_events', 3, 'social_risk', 0.19, 'claim_count_4w', 2), NOW()),
    (pr6, r6, ws + 7,  92, 2, 0.31, jsonb_build_object('forecast_risk', 0.31, 'historical_events', 2, 'social_risk', 0.16, 'claim_count_4w', 2), NOW()),
    (pr7, r7, ws + 7,  59, 2, 0.24, jsonb_build_object('forecast_risk', 0.24, 'historical_events', 2, 'social_risk', 0.15, 'claim_count_4w', 1), NOW()),
    (pr8, r8, ws + 7, 149, 4, 0.52, jsonb_build_object('forecast_risk', 0.52, 'historical_events', 4, 'social_risk', 0.27, 'claim_count_4w', 1), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ─── Rider Notifications (payouts, reminders, system) ───
  INSERT INTO rider_notifications (profile_id, title, body, type, metadata, created_at)
  VALUES
    (r1, 'Claim paid — ₹320 credited', 'Traffic gridlock in Koramangala reduced delivery availability. Your income-support payout is complete.', 'payout', jsonb_build_object('claim_id', cl1, 'amount_inr', 320, 'subtype', 'traffic_gridlock'), NOW() - interval '4 hours 47 minutes'),
    (r2, 'Claim paid — ₹480 credited', 'Heavy rain in Andheri West crossed the parametric threshold. Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl2, 'amount_inr', 480, 'subtype', 'heavy_rain'), NOW() - interval '20 hours 54 minutes'),
    (r3, 'Claim paid — ₹210 credited', 'Extreme heat in Connaught Place affected delivery hours. Your payout is complete.', 'payout', jsonb_build_object('claim_id', cl3, 'amount_inr', 210, 'subtype', 'extreme_heat'), NOW() - interval '44 hours 54 minutes'),
    (r4, 'Claim created — verify location', 'Bandh / curfew affecting your zone. Verify inside your insured geofence within 48h to qualify for up to ₹700 (Standard cap).', 'payout', jsonb_build_object('claim_id', cl4, 'amount_inr', 700, 'subtype', 'zone_curfew'), NOW() - interval '10 hours'),
    (r5, 'Claim paid — ₹450 credited', 'Rain disruption in Shivajinagar was verified automatically. Your income-support payout is complete.', 'payout', jsonb_build_object('claim_id', cl_flag, 'amount_inr', 450, 'subtype', 'heavy_rain'), NOW() - interval '2 hours 54 minutes'),
    (r6, 'Claim paid — ₹350 credited', 'Heavy rain near HITEC City crossed the payout threshold. Credited through instant UPI.', 'payout', jsonb_build_object('claim_id', cl_fraud_gps, 'amount_inr', 350, 'subtype', 'heavy_rain'), NOW() - interval '1 hour 54 minutes'),
    (r2, 'Claim paid — ₹250 credited', 'Heavy rain (last week). Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl_pw1, 'amount_inr', 250), pw_ist + interval '5 days'),
    (r3, 'Claim paid — ₹169 credited', 'Severe AQI (last week). Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl_pw2, 'amount_inr', 169), pw_ist + interval '3 days 2 hours'),
    (r1, 'Welcome to Oasis!', 'Your income protection is active. We''ll auto-detect disruptions and pay you instantly.', 'system', '{}', NOW() - interval '30 days'),
    (r2, 'Welcome to Oasis!', 'Your income protection is active. We''ll auto-detect disruptions and pay you instantly.', 'system', '{}', NOW() - interval '28 days'),
    (r3, 'Welcome to Oasis!', 'Your income protection is active. We''ll auto-detect disruptions and pay you instantly.', 'system', '{}', NOW() - interval '25 days'),
    (r4, 'Welcome to Oasis!', 'Your Standard weekly cover is active for Sector 62, Noida.', 'system', '{}', NOW() - interval '24 days'),
    (r5, 'Welcome to Oasis!', 'Your Premium weekly cover is active for Shivajinagar, Pune.', 'system', '{}', NOW() - interval '22 days'),
    (r6, 'Welcome to Oasis!', 'Your Standard weekly cover is active for HITEC City, Hyderabad.', 'system', '{}', NOW() - interval '20 days'),
    (r7, 'Welcome to Oasis!', 'Your Basic weekly cover is active for Park Street, Kolkata.', 'system', '{}', NOW() - interval '18 days'),
    (r8, 'Welcome to Oasis!', 'Your Premium weekly cover is active for Cyber City, Gurugram.', 'system', '{}', NOW() - interval '16 days'),
    (r4, 'Reminder: verify your location', 'You have 36h left to verify your location for the Noida zone-curfew payout.', 'reminder', jsonb_build_object('claim_id', cl4, 'reminder_hours', 36), NOW()),
    (r4, 'Claim paid — ₹300 credited', 'Noida zone restriction was confirmed and your verified payout is complete.', 'payout', jsonb_build_object('claim_id', cl_r4_paid, 'amount_inr', 300, 'subtype', 'zone_curfew'), NOW() - interval '6 hours 49 minutes'),
    (r5, 'Claim paid — ₹275 credited', 'Moderate rain disruption near Pune central was verified automatically.', 'payout', jsonb_build_object('claim_id', cl_r5_paid, 'amount_inr', 275, 'subtype', 'heavy_rain'), NOW() - interval '1 hour 19 minutes'),
    (r6, 'Claim paid — ₹240 credited', 'Second Hyderabad rain trigger was verified within your weekly Standard cover.', 'payout', jsonb_build_object('claim_id', cl_r6_paid, 'amount_inr', 240, 'subtype', 'heavy_rain'), NOW() - interval '1 hour 7 minutes'),
    (r7, 'Claim paid — ₹180 credited', 'Park Street rain disruption qualified under your Basic weekly cover.', 'payout', jsonb_build_object('claim_id', cl_r7_paid, 'amount_inr', 180, 'subtype', 'heavy_rain'), NOW() - interval '47 minutes'),
    (r8, 'Claim paid — ₹410 credited', 'Cyber City gridlock was verified and your Premium payout is complete.', 'payout', jsonb_build_object('claim_id', cl_r8_paid, 'amount_inr', 410, 'subtype', 'traffic_gridlock'), NOW() - interval '27 minutes'),
    (r7, 'Review closed', 'One older self-report was outside the insured zone and closed without payout. Your active cover remains unchanged.', 'system', jsonb_build_object('claim_id', cl_rejected, 'subtype', 'review_closed'), NOW() - interval '7 hours 55 minutes'),
    (r1, 'Claim queued for review', 'We found multiple same-week trigger matches. An admin will review before payout.', 'payout', jsonb_build_object('claim_id', cl_q_rapid, 'subtype', 'rapid_repeat_hold'), NOW() - interval '24 minutes'),
    (r2, 'Location review needed', 'Your claim is held while we verify the submitted GPS point against your insured zone.', 'payout', jsonb_build_object('claim_id', cl_q_gps, 'subtype', 'gps_hold'), NOW() - interval '31 minutes'),
    (r8, 'Device verification review', 'A new device was used during verification, so the payout is temporarily queued for admin review.', 'payout', jsonb_build_object('claim_id', cl_q_device, 'subtype', 'device_hold'), NOW() - interval '47 minutes'),
    (r5, 'Report under review', 'Your report needs one manual check because external disruption signals were weaker than usual.', 'payout', jsonb_build_object('claim_id', cl_q_weather, 'subtype', 'corroboration_hold'), NOW() - interval '63 minutes')
  ON CONFLICT DO NOTHING;

  -- ─── Rider Delivery Reports (self-reports) ────────────────
  INSERT INTO rider_delivery_reports (profile_id, zone_lat, zone_lng, report_type, message, photo_url, created_at)
  VALUES
    (r2, 19.1136, 72.8697, 'cant_deliver',
     'Heavy waterlogging near Andheri station. Roads completely submerged, two-wheelers cannot pass. Multiple delivery partners stranded.',
     NULL, NOW() - interval '2 days'),
    (r4, 28.5355, 77.3910, 'cant_deliver',
     'Temporary closure near Noida Sector 62 market. Store shutters down and delivery partners asked to wait outside the zone.',
     NULL, NOW() - interval '2 days 3 hours'),
    (r6, 17.4483, 78.3915, 'cant_deliver',
     'Heavy rain around HITEC City slowed pickups; several access roads were waterlogged but reopened later in the evening.',
     NULL, NOW() - interval '1 day 4 hours'),
    (r8, 28.4595, 77.0266, 'cant_deliver',
     'Cyber City traffic gridlock near the underpass delayed multiple Q-commerce routes during the evening peak.',
     NULL, NOW() - interval '6 hours')
  ON CONFLICT DO NOTHING;

  -- ─── Payment Transactions (Razorpay-shaped IDs for admin Payment Logs) ─
  INSERT INTO payment_transactions (id, profile_id, weekly_policy_id, amount_inr, status, razorpay_order_id, razorpay_payment_id, razorpay_payment_method, paid_at, created_at)
  VALUES
    (gen_random_uuid(), r1, pol1,  99, 'paid', 'order_DemoR1Ws' || substring(md5('r1'||ws::text) from 1 for 8), 'pay_DemoR1Ws' || substring(md5('r1p'||ws::text) from 1 for 8), 'upi', ws_ist + interval '1 hour', ws_ist + interval '1 hour'),
    (gen_random_uuid(), r2, pol2, 199, 'paid', 'order_DemoR2Ws' || substring(md5('r2'||ws::text) from 1 for 8), 'pay_DemoR2Ws' || substring(md5('r2p'||ws::text) from 1 for 8), 'card', ws_ist + interval '2 hours', ws_ist + interval '2 hours'),
    (gen_random_uuid(), r3, pol3,  49, 'paid', 'order_DemoR3Ws' || substring(md5('r3'||ws::text) from 1 for 8), 'pay_DemoR3Ws' || substring(md5('r3p'||ws::text) from 1 for 8), 'upi', ws_ist + interval '3 hours', ws_ist + interval '3 hours'),
    (gen_random_uuid(), r4, pol4,  99, 'paid', 'order_DemoR4Ws' || substring(md5('r4'||ws::text) from 1 for 8), 'pay_DemoR4Ws' || substring(md5('r4p'||ws::text) from 1 for 8), 'upi', ws_ist + interval '4 hours', ws_ist + interval '4 hours'),
    (gen_random_uuid(), r5, pol5, 199, 'paid', 'order_DemoR5Ws' || substring(md5('r5'||ws::text) from 1 for 8), 'pay_DemoR5Ws' || substring(md5('r5p'||ws::text) from 1 for 8), 'card', ws_ist + interval '5 hours', ws_ist + interval '5 hours'),
    (gen_random_uuid(), r6, pol6,  99, 'paid', 'order_DemoR6Ws' || substring(md5('r6'||ws::text) from 1 for 8), 'pay_DemoR6Ws' || substring(md5('r6p'||ws::text) from 1 for 8), 'upi', ws_ist + interval '6 hours', ws_ist + interval '6 hours'),
    (gen_random_uuid(), r7, pol7,  49, 'paid', 'order_DemoR7Ws' || substring(md5('r7'||ws::text) from 1 for 8), 'pay_DemoR7Ws' || substring(md5('r7p'||ws::text) from 1 for 8), 'upi', ws_ist + interval '7 hours', ws_ist + interval '7 hours'),
    (gen_random_uuid(), r8, pol8, 199, 'paid', 'order_DemoR8Ws' || substring(md5('r8'||ws::text) from 1 for 8), 'pay_DemoR8Ws' || substring(md5('r8p'||ws::text) from 1 for 8), 'card', ws_ist + interval '8 hours', ws_ist + interval '8 hours'),
    (gen_random_uuid(), r1, pol_pw1,  99, 'paid', 'order_DemoR1Pw', 'pay_DemoR1Pw', 'upi', pw_ist + interval '1 day', pw_ist + interval '1 day'),
    (gen_random_uuid(), r2, pol_pw2, 199, 'paid', 'order_DemoR2Pw', 'pay_DemoR2Pw', 'upi', pw_ist + interval '1 day', pw_ist + interval '1 day'),
    (gen_random_uuid(), r3, pol_pw3,  49, 'paid', 'order_DemoR3Pw', 'pay_DemoR3Pw', 'card', pw_ist + interval '1 day', pw_ist + interval '1 day'),
    (gen_random_uuid(), r4, pol_pw4,  99, 'paid', 'order_DemoR4Pw', 'pay_DemoR4Pw', 'upi', pw_ist + interval '1 day', pw_ist + interval '1 day'),
    (gen_random_uuid(), r5, pol_pw5, 199, 'paid', 'order_DemoR5Pw', 'pay_DemoR5Pw', 'card', pw_ist + interval '1 day', pw_ist + interval '1 day'),
    (gen_random_uuid(), r6, pol_pw6,  99, 'paid', 'order_DemoR6Pw', 'pay_DemoR6Pw', 'upi', pw_ist + interval '1 day', pw_ist + interval '1 day'),
    (gen_random_uuid(), r7, pol_pw7,  49, 'paid', 'order_DemoR7Pw', 'pay_DemoR7Pw', 'upi', pw_ist + interval '1 day', pw_ist + interval '1 day'),
    (gen_random_uuid(), r8, pol_pw8, 199, 'paid', 'order_DemoR8Pw', 'pay_DemoR8Pw', 'card', pw_ist + interval '1 day', pw_ist + interval '1 day')
  ON CONFLICT DO NOTHING;

  UPDATE weekly_policies wp
  SET
    razorpay_order_id = pt.razorpay_order_id,
    razorpay_payment_id = pt.razorpay_payment_id,
    razorpay_payment_method = pt.razorpay_payment_method,
    updated_at = NOW()
  FROM payment_transactions pt
  WHERE pt.weekly_policy_id = wp.id
    AND pt.status = 'paid'
    AND wp.id IN (pol1, pol2, pol3, pol4, pol5, pol6, pol7, pol8, pol_pw1, pol_pw2, pol_pw3, pol_pw4, pol_pw5, pol_pw6, pol_pw7, pol_pw8);

  -- ─── System Logs (Health page — recent adjudicator runs) ────
  INSERT INTO system_logs (event_type, severity, metadata, created_at)
  VALUES
    ('adjudicator_run', 'info', jsonb_build_object(
      'run_id', 'demo-' || to_char(NOW(), 'YYYYMMDD'),
      'candidates_found', 8,
      'claims_created', 2,
      'payouts_initiated', 2,
      'duration_ms', 1820,
      'seed', true
    ), NOW() - interval '2 hours'),
    ('adjudicator_run', 'info', jsonb_build_object(
      'run_id', 'demo-' || to_char(NOW() - interval '1 day', 'YYYYMMDD'),
      'candidates_found', 5,
      'claims_created', 1,
      'payouts_initiated', 1,
      'duration_ms', 2100,
      'seed', true
    ), NOW() - interval '26 hours'),
    ('adjudicator_run', 'info', jsonb_build_object(
      'run_id', 'demo-' || to_char(NOW() - interval '3 days', 'YYYYMMDD'),
      'candidates_found', 7,
      'claims_created', 2,
      'payouts_initiated', 2,
      'duration_ms', 2350,
      'seed', true
    ), NOW() - interval '3 days'),
    ('adjudicator_demo', 'info', jsonb_build_object(
      'run_id', 'demo-seed',
      'candidates', 4,
      'claims_created', 1,
      'zones', 3,
      'duration_ms', 1650,
      'seed', true
    ), NOW() - interval '5 hours'),
    ('trigger_ingest', 'info', jsonb_build_object('source', 'tomorrow_io', 'events_created', 3, 'seed', true), NOW() - interval '4 hours');

  RAISE NOTICE '✅ Demo data seeded successfully!';
  RAISE NOTICE '   IST week % to % | current-week premium ₹992 | recent paid payouts ₹3215 + prior-week paid ₹419 in history', ws, we;
  RAISE NOTICE '   Fraud queue: 4 pending holds + 1 closed admin hold; all riders remain verified demo users';
  RAISE NOTICE '   8 riders | 16 disruption events (incl. last-24h density) | 12-week pricing snapshots | Razorpay refs on policies';
  RAISE NOTICE '   Rider login: saumy@demo.com / Demo@1234 (also varun/aditya/alok/utkarsh/roshan/sahil/aniket@demo.com) | Admin: admin.demo@oasis.app / Demo@1234';

END $$;
