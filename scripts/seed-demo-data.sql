-- ============================================================
-- Seed Demo Data for Oasis Parametric Insurance Platform
--
-- Demo-ready data for loss ratio, analytics, and full flows:
--   - 5 riders across Indian metros (current + previous + two-weeks-ago policies)
--   - Admin analytics: premiums = sum of weekly_policies where week_start_date is in the dashboard window;
--     claims = parametric_claims in that window. After seed, headline loss ratio is ~45–50% (green); current-week ~70%.
--   - Fraud queue: 3 flagged, all reviewed (no pending — admin insights stay green)
--   - Disruption events (all trigger subtypes), claim verifications, payouts
--   - Notifications, premium recommendations, payment transactions, self-reports
--
-- How to run:
--   Supabase Dashboard → SQL Editor → paste this file → Run
--
-- Real riders (your own signups) are NOT in this file — they keep random UUIDs.
-- To align geofence JSON + Razorpay refs with the demo shape, run after edits:
--   scripts/sync-non-seed-rider-accounts.sql
--
-- Demo logins (email / password):
--   rahul.demo@oasis.app  / Demo@1234  (Bangalore, Standard)
--   priya.demo@oasis.app  / Demo@1234  (Mumbai, Premium)
--   amit.demo@oasis.app   / Demo@1234  (Delhi, Basic)
--   sneha.demo@oasis.app  / Demo@1234  (Hyderabad, Standard)
--   vijay.demo@oasis.app  / Demo@1234  (Chennai, Premium)
-- ============================================================

DO $$
DECLARE
  -- Rider UUIDs (fixed for reproducibility)
  r1 UUID := 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'; -- Rahul, Bangalore
  r2 UUID := 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'; -- Priya, Mumbai
  r3 UUID := 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f'; -- Amit, Delhi
  r4 UUID := 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a'; -- Sneha, Hyderabad
  r5 UUID := 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b'; -- Vijay, Chennai
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
  ev_hyd   UUID := 'f0f0f0f0-5555-4555-8555-555555555555'; -- Hyderabad zone — paid claim for r4 wallet

  -- Policy UUIDs: current week (pol1..pol5), previous week (pol_pw1..pol_pw5)
  pol1 UUID := 'f1f1f1f1-1111-4111-8111-111111111111';
  pol2 UUID := 'f2f2f2f2-2222-4222-8222-222222222222';
  pol3 UUID := 'f3f3f3f3-3333-4333-8333-333333333333';
  pol4 UUID := 'f4f4f4f4-4444-4444-8444-444444444444';
  pol5 UUID := 'f5f5f5f5-5555-4555-8555-555555555555';
  pol_pw1 UUID := 'a1a1a1a1-1111-4111-8111-111111111111';
  pol_pw2 UUID := 'a2a2a2a2-2222-4222-8222-222222222222';
  pol_pw3 UUID := 'a3a3a3a3-3333-4333-8333-333333333333';
  pol_pw4 UUID := 'a4a4a4a4-4444-4444-8444-444444444444';
  pol_pw5 UUID := 'a5a5a5a5-5555-4555-8555-555555555555';
  -- Two weeks ago (for pricing timeline)
  pol_tw1 UUID := 'b1b1b1b1-1111-4111-8111-111111111111';
  pol_tw2 UUID := 'b2b2b2b2-2222-4222-8222-222222222222';
  pol_tw3 UUID := 'b3b3b3b3-3333-4333-8333-333333333333';
  pol_tw4 UUID := 'b4b4b4b4-4444-4444-8444-444444444444';
  pol_tw5 UUID := 'b5b5b5b5-5555-4555-8555-555555555555';

  -- Claim UUIDs: current week (cl1..cl4, cl_flag), previous week (cl_pw1, cl_pw2)
  cl1 UUID := 'c1010101-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  cl2 UUID := 'c2020202-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  cl3 UUID := 'c3030303-cccc-4ccc-8ccc-cccccccccccc';
  cl4 UUID := 'c4040404-dddd-4ddd-8ddd-dddddddddddd';
  cl_flag UUID := 'c5050505-eeee-4eee-8eee-eeeeeeeeeeee'; -- fraud: rapid triggers (pending review)
  cl_fraud_gps UUID := 'c6060606-1111-4111-8111-111111111111'; -- fraud: GPS / zone mismatch (pending review)
  cl_pw1 UUID := 'd1010101-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  cl_pw2 UUID := 'd2020202-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  cl_rejected UUID := 'd3030303-cccc-4ccc-8ccc-cccccccccccc'; -- fraud: device fingerprint (reviewed → rejected)
  cl_r4_paid UUID := 'c7070707-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; -- Sneha: paid (wallet was empty)
  cl_r5_paid UUID := 'c8080808-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; -- Vijay: paid (wallet was empty)

  -- Claim verification UUIDs (schema has no unique on claim_id/profile_id)
  cv1 UUID := 'aa111111-0000-4000-8000-000000000001';
  cv2 UUID := 'aa111111-0000-4000-8000-000000000002';
  cv3 UUID := 'aa111111-0000-4000-8000-000000000003';
  cv_pw1 UUID := 'aa111111-0000-4000-8000-000000000004';
  cv_pw2 UUID := 'aa111111-0000-4000-8000-000000000005';
  cv4 UUID := 'aa111111-0000-4000-8000-000000000006';
  cv5 UUID := 'aa111111-0000-4000-8000-000000000007';

  -- Premium recommendation UUIDs (schema has no unique on profile_id/week_start_date)
  pr1 UUID := 'bb222222-0000-4000-8000-000000000001';
  pr2 UUID := 'bb222222-0000-4000-8000-000000000002';
  pr3 UUID := 'bb222222-0000-4000-8000-000000000003';
  pr4 UUID := 'bb222222-0000-4000-8000-000000000004';
  pr5 UUID := 'bb222222-0000-4000-8000-000000000005';

  -- Plan IDs (looked up)
  plan_basic    UUID;
  plan_standard UUID;
  plan_premium  UUID;

  -- Dynamic dates
  ws  DATE := date_trunc('week', NOW())::DATE;
  we  DATE;
  pw_start DATE;
  pw_end   DATE;
  tw_start DATE;
  tw_end   DATE;

  hashed_pw TEXT;
BEGIN
  we := ws + 6;
  pw_start := ws - 7;
  pw_end := ws - 1;
  tw_start := ws - 14;
  tw_end := ws - 8;
  hashed_pw := crypt('Demo@1234', gen_salt('bf'));

  -- ─── Clean up previous demo data (safe re-run) ───────────
  DELETE FROM claim_verifications    WHERE id IN (cv1, cv2, cv3, cv_pw1, cv_pw2, cv4, cv5);
  DELETE FROM rider_notifications    WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM payout_ledger          WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM parametric_claims      WHERE id IN (cl1, cl2, cl3, cl4, cl_flag, cl_fraud_gps, cl_pw1, cl_pw2, cl_rejected, cl_r4_paid, cl_r5_paid);
  DELETE FROM payment_transactions   WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM weekly_policies        WHERE id IN (pol1, pol2, pol3, pol4, pol5, pol_pw1, pol_pw2, pol_pw3, pol_pw4, pol_pw5, pol_tw1, pol_tw2, pol_tw3, pol_tw4, pol_tw5);
  DELETE FROM premium_recommendations WHERE id IN (pr1, pr2, pr3, pr4, pr5);
  DELETE FROM rider_delivery_reports WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM live_disruption_events  WHERE id IN (ev_heat, ev_rain_m, ev_aqi, ev_traffic, ev_curfew, ev_rain_c, ev_heat2, ev_rain_pw, ev_aqi_pw, ev_restrict, ev_live1, ev_live2, ev_live3, ev_hyd);
  -- Pricing snapshots (new widget)
  DELETE FROM plan_pricing_snapshots WHERE week_start_date IN (ws, pw_start, tw_start);
  DELETE FROM system_logs             WHERE (event_type IN ('adjudicator_run', 'adjudicator_demo') AND (metadata->>'run_id') = 'demo-seed')
    OR (metadata->>'seed') = 'true';
  DELETE FROM weekly_policies        WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM profiles               WHERE id IN (r1, r2, r3, r4, r5);
  DELETE FROM profiles               WHERE id IN (admin1);

  -- ─── Ensure plan packages exist ───────────────────────────
  INSERT INTO plan_packages (slug, name, description, weekly_premium_inr, payout_per_claim_inr, max_claims_per_week, sort_order)
  VALUES
    ('basic',    'Basic',    'Covers fuel & food costs on disrupted days — your minimum safety net',    49,  300,  1, 1),
    ('standard', 'Standard', 'Replaces ~70% of a lost day''s income — the most popular plan',          99,  700,  2, 2),
    ('premium',  'Premium',  'Full income replacement + expenses for high-risk zones',                 199, 1500, 3, 3)
  ON CONFLICT (slug) DO NOTHING;

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
    (r1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rahul.demo@oasis.app',  hashed_pw, NOW() - interval '30 days', NOW() - interval '30 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rahul Sharma"}',  false, '', '', '', ''),
    (r2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya.demo@oasis.app',  hashed_pw, NOW() - interval '28 days', NOW() - interval '28 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Patel"}',   false, '', '', '', ''),
    (r3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'amit.demo@oasis.app',   hashed_pw, NOW() - interval '25 days', NOW() - interval '25 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amit Kumar"}',    false, '', '', '', ''),
    (r4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sneha.demo@oasis.app',  hashed_pw, NOW() - interval '20 days', NOW() - interval '20 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sneha Reddy"}',   false, '', '', '', ''),
    (r5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vijay.demo@oasis.app',  hashed_pw, NOW() - interval '18 days', NOW() - interval '18 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vijay Singh"}',   false, '', '', '', ''),
    (admin1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.demo@oasis.app', hashed_pw, NOW() - interval '60 days', NOW() - interval '60 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"John Doe"}', false, '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (r1, r1, jsonb_build_object('sub', r1::text, 'email', 'rahul.demo@oasis.app'), 'email', r1::text, NOW(), NOW() - interval '30 days', NOW()),
    (r2, r2, jsonb_build_object('sub', r2::text, 'email', 'priya.demo@oasis.app'), 'email', r2::text, NOW(), NOW() - interval '28 days', NOW()),
    (r3, r3, jsonb_build_object('sub', r3::text, 'email', 'amit.demo@oasis.app'),  'email', r3::text, NOW(), NOW() - interval '25 days', NOW()),
    (r4, r4, jsonb_build_object('sub', r4::text, 'email', 'sneha.demo@oasis.app'), 'email', r4::text, NOW(), NOW() - interval '20 days', NOW()),
    (r5, r5, jsonb_build_object('sub', r5::text, 'email', 'vijay.demo@oasis.app'), 'email', r5::text, NOW(), NOW() - interval '18 days', NOW()),
    (admin1, admin1, jsonb_build_object('sub', admin1::text, 'email', 'admin.demo@oasis.app'), 'email', admin1::text, NOW(), NOW() - interval '60 days', NOW())
  ON CONFLICT DO NOTHING;

  -- ─── Profiles ─────────────────────────────────────────────
  INSERT INTO profiles (id, full_name, phone_number, platform, zone_latitude, zone_longitude, role, government_id_verified, face_verified, primary_zone_geofence)
  VALUES
    (r1, 'Rahul Sharma', '+919876543210', 'zepto',   12.9352, 77.6245, 'rider', true, true, '{"type":"circle","lat":12.9352,"lng":77.6245,"radius_km":5,"zone_name":"Koramangala, Bengaluru"}'),
    (r2, 'Priya Patel',  '+919876543211', 'blinkit', 19.1136, 72.8697, 'rider', true, true, '{"type":"circle","lat":19.1136,"lng":72.8697,"radius_km":5,"zone_name":"Andheri West, Mumbai"}'),
    (r3, 'Amit Kumar',   '+919876543212', 'zepto',   28.6315, 77.2167, 'rider', true, true, '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":5,"zone_name":"Connaught Place, New Delhi"}'),
    (r4, 'Sneha Reddy',  '+919876543213', 'blinkit', 17.4483, 78.3915, 'rider', true, true, '{"type":"circle","lat":17.4483,"lng":78.3915,"radius_km":5,"zone_name":"HITEC City, Hyderabad"}'),
    (r5, 'Vijay Singh',  '+919876543214', 'zepto',   13.0418, 80.2341, 'rider', true, true, '{"type":"circle","lat":13.0418,"lng":80.2341,"radius_km":5,"zone_name":"Velachery, Chennai"}'),
    (admin1, 'John Doe', '+910000000000', NULL, NULL, NULL, 'admin', false, false, NULL)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    platform = EXCLUDED.platform,
    zone_latitude = EXCLUDED.zone_latitude,
    zone_longitude = EXCLUDED.zone_longitude,
    government_id_verified = EXCLUDED.government_id_verified,
    face_verified = EXCLUDED.face_verified,
    primary_zone_geofence = EXCLUDED.primary_zone_geofence;

  -- ─── Disruption Events (current + previous week) ─────────
  INSERT INTO live_disruption_events (id, event_type, event_subtype, severity_score, geofence_polygon, verified_by_llm, raw_api_data, created_at)
  VALUES
    (ev_heat, 'weather', 'extreme_heat', 8.5,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":15}',
     false, '{"trigger":"extreme_heat","source":"tomorrow_io","temperature":45.2,"feels_like":48.1}',
     NOW() - interval '2 days'),
    (ev_rain_m, 'weather', 'heavy_rain', 9.0,
     '{"type":"circle","lat":19.1136,"lng":72.8697,"radius_km":15}',
     false, '{"trigger":"heavy_rain","source":"open_meteo","precipitationIntensity":12.5,"humidity":95}',
     NOW() - interval '1 day'),
    (ev_aqi, 'weather', 'severe_aqi', 7.5,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":20}',
     false, '{"trigger":"severe_aqi","source":"waqi","current_aqi":312,"adaptive_threshold":201}',
     NOW() - interval '3 days'),
    (ev_traffic, 'traffic', 'traffic_gridlock', 8.0,
     '{"type":"circle","lat":12.9352,"lng":77.6245,"radius_km":15}',
     true, '{"trigger":"traffic_gridlock","source":"tomtom_traffic","sample_points":5,"congested_points":4,"avg_ratio":0.18}',
     NOW() - interval '5 hours'),
    (ev_curfew, 'social', 'zone_curfew', 9.0,
     '{"type":"circle","lat":17.4483,"lng":78.3915,"radius_km":20}',
     true, '{"trigger":"zone_curfew","source":"newsdata_llm","articles":[{"title":"Telangana bandh: shops shut in Hyderabad"}]}',
     NOW() - interval '4 days'),
    (ev_rain_c, 'weather', 'heavy_rain', 8.0,
     '{"type":"circle","lat":13.0418,"lng":80.2341,"radius_km":15}',
     false, '{"trigger":"heavy_rain","source":"open_meteo","precipitationIntensity":8.3,"humidity":92}',
     NOW() - interval '3 hours'),
    (ev_heat2, 'weather', 'extreme_heat', 7.0,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":15}',
     false, '{"trigger":"extreme_heat","source":"tomorrow_io","temperature":43.8}',
     NOW() - interval '9 days'),
    (ev_rain_pw, 'weather', 'heavy_rain', 8.5,
     '{"type":"circle","lat":19.1136,"lng":72.8697,"radius_km":15}',
     false, '{"trigger":"heavy_rain","source":"open_meteo","precipitationIntensity":10.2}',
     pw_start::timestamptz + interval '4 days'),
    (ev_aqi_pw, 'weather', 'severe_aqi', 7.0,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":20}',
     false, '{"trigger":"severe_aqi","source":"waqi","current_aqi":288}',
     pw_start::timestamptz + interval '2 days'),
    (ev_restrict, 'social', 'local_restriction', 8.2,
     '{"type":"circle","lat":12.9352,"lng":77.6245,"radius_km":12}',
     true, '{"trigger":"local_restriction","source":"newsdata_llm","summary":"Local restriction announced in zone"}',
     NOW() - interval '12 hours'),
    (ev_live1, 'weather', 'heavy_rain', 7.8,
     '{"type":"circle","lat":12.97,"lng":77.59,"radius_km":10}',
     false, '{"trigger":"heavy_rain","source":"open_meteo","precipitationIntensity":6.2,"demo":"last24h"}',
     NOW() - interval '5 hours'),
    (ev_live2, 'traffic', 'traffic_gridlock', 7.5,
     '{"type":"circle","lat":19.11,"lng":72.87,"radius_km":8}',
     true, '{"trigger":"traffic_gridlock","source":"tomtom_traffic","demo":"last24h"}',
     NOW() - interval '14 hours'),
    (ev_live3, 'weather', 'extreme_heat', 7.6,
     '{"type":"circle","lat":28.63,"lng":77.22,"radius_km":14}',
     false, '{"trigger":"extreme_heat","source":"tomorrow_io","temperature":42.1,"demo":"last24h"}',
     NOW() - interval '2 hours'),
    (ev_hyd, 'weather', 'heavy_rain', 7.8,
     '{"type":"circle","lat":17.4483,"lng":78.3915,"radius_km":12}',
     false, '{"trigger":"heavy_rain","source":"open_meteo","seed":"wallet_demo_r4"}',
     NOW() - interval '8 hours')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Weekly Policies: current week + previous week ───────
  -- Current week: 5 riders, total premium 645. Target loss ratio ~70% → payouts ~452.
  INSERT INTO weekly_policies (id, profile_id, plan_id, week_start_date, week_end_date, weekly_premium_inr, is_active, payment_status, created_at)
  VALUES
    (pol1, r1, plan_standard, ws, we,  99, true,  'paid', ws::timestamptz),
    (pol2, r2, plan_premium,  ws, we, 199, true,  'paid', ws::timestamptz),
    (pol3, r3, plan_basic,    ws, we,  49, true,  'paid', ws::timestamptz),
    (pol4, r4, plan_standard, ws, we,  99, true,  'paid', ws::timestamptz),
    (pol5, r5, plan_premium,  ws, we, 199, true,  'paid', ws::timestamptz),
    (pol_pw1, r1, plan_standard, pw_start, pw_end,  99, false, 'paid', pw_start::timestamptz),
    (pol_pw2, r2, plan_premium,  pw_start, pw_end, 199, false, 'paid', pw_start::timestamptz),
    (pol_pw3, r3, plan_basic,    pw_start, pw_end,  49, false, 'paid', pw_start::timestamptz),
    (pol_pw4, r4, plan_standard, pw_start, pw_end,  99, false, 'paid', pw_start::timestamptz),
    (pol_pw5, r5, plan_premium,  pw_start, pw_end, 199, false, 'paid', pw_start::timestamptz),
    (pol_tw1, r1, plan_basic,    tw_start, tw_end,  52, false, 'paid', tw_start::timestamptz),
    (pol_tw2, r2, plan_standard, tw_start, tw_end, 105, false, 'paid', tw_start::timestamptz),
    (pol_tw3, r3, plan_basic,    tw_start, tw_end,  52, false, 'paid', tw_start::timestamptz),
    (pol_tw4, r4, plan_standard, tw_start, tw_end, 105, false, 'paid', tw_start::timestamptz),
    (pol_tw5, r5, plan_premium,  tw_start, tw_end, 210, false, 'paid', tw_start::timestamptz)
  ON CONFLICT (id) DO NOTHING;

  -- ─── Plan pricing snapshots (last 3 weeks) ────────────────
  -- These drive the admin pricing timeline + forecast chart.
  INSERT INTO plan_pricing_snapshots (week_start_date, plan_id, weekly_premium_inr, source)
  VALUES
    (tw_start, plan_basic,    52,  'manual'),
    (tw_start, plan_standard, 105, 'manual'),
    (tw_start, plan_premium,  210, 'manual'),
    (pw_start, plan_basic,    47,  'manual'),
    (pw_start, plan_standard, 95,  'manual'),
    (pw_start, plan_premium,  189, 'manual'),
    (ws,       plan_basic,    49,  'manual'),
    (ws,       plan_standard, 99,  'manual'),
    (ws,       plan_premium,  199, 'manual')
  ON CONFLICT (week_start_date, plan_id) DO UPDATE SET
    weekly_premium_inr = EXCLUDED.weekly_premium_inr,
    source = EXCLUDED.source;

  -- ─── Parametric Claims ───────────────────────────────────
  -- Paid + normal pending + fraud-queue examples: 2 flagged pending + 1 flagged reviewed.
  -- Previous week: 2 paid. Loss ratio ~65–72%% vs premiums.
  INSERT INTO parametric_claims (id, policy_id, disruption_event_id, payout_amount_inr, status, is_flagged, flag_reason, gateway_transaction_id, created_at)
  VALUES
    (cl1, pol1, ev_traffic, 200, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_1',
     NOW() - interval '5 hours'),
    (cl2, pol2, ev_rain_m, 152, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_2',
     NOW() - interval '22 hours'),
    (cl3, pol3, ev_heat, 100, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_3',
     NOW() - interval '46 hours'),
    (cl4, pol4, ev_curfew, 0, 'pending_verification', false, NULL, NULL,
     NOW() - interval '10 hours'),
    (cl_flag, pol2, ev_aqi, 0, 'pending_verification', true,
     'Rapid claims: 2 parametric triggers in 24h on the same policy — manual review',
     NULL,
     NOW() - interval '1 hour'),
    (cl_fraud_gps, pol3, ev_aqi, 0, 'pending_verification', true,
     'GPS verification failed: rider location 4.2 km outside contracted delivery geofence',
     NULL,
     NOW() - interval '2 hours'),
    (cl_pw1, pol_pw2, ev_rain_pw, 250, 'paid', false, NULL,
     'oasis_verify_pw_' || extract(epoch from NOW())::bigint || '_1',
     pw_start::timestamptz + interval '5 days'),
    (cl_pw2, pol_pw3, ev_aqi_pw, 169, 'paid', false, NULL,
     'oasis_verify_pw_' || extract(epoch from NOW())::bigint || '_2',
     pw_start::timestamptz + interval '3 days'),
    (cl_rejected, pol5, ev_restrict, 0, 'triggered', true,
     'Device fingerprint mismatch: claim submitted from unrecognized handset vs last verified device',
     NULL,
     NOW() - interval '9 hours'),
    (cl_r4_paid, pol4, ev_hyd, 150, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_r4',
     NOW() - interval '2 hours'),
    (cl_r5_paid, pol5, ev_rain_c, 150, 'paid', false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_r5',
     NOW() - interval '90 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- Flagged claims already adjudicated (Fraud page: Reviewed only — insights queue stays green)
  UPDATE parametric_claims
    SET admin_review_status = 'rejected',
        reviewed_by = 'admin.demo@oasis.app',
        reviewed_at = NOW() - interval '8 hours',
        updated_at = NOW()
    WHERE id IN (cl_rejected, cl_flag, cl_fraud_gps);

  -- ─── Claim Verifications (for paid claims) ───────────────
  INSERT INTO claim_verifications (id, claim_id, profile_id, verified_lat, verified_lng, verified_at, status, declaration_confirmed, declaration_at)
  VALUES
    (cv1, cl1, r1, 12.9360, 77.6250, NOW() - interval '4 hours 50 minutes', 'inside_geofence', true, NOW() - interval '4 hours 50 minutes'),
    (cv2, cl2, r2, 19.1140, 72.8700, NOW() - interval '21 hours', 'inside_geofence', true, NOW() - interval '21 hours'),
    (cv3, cl3, r3, 28.6320, 77.2170, NOW() - interval '45 hours', 'inside_geofence', true, NOW() - interval '45 hours'),
    (cv_pw1, cl_pw1, r2, 19.1140, 72.8700, pw_start::timestamptz + interval '5 days 1 hour', 'inside_geofence', true, pw_start::timestamptz + interval '5 days 1 hour'),
    (cv_pw2, cl_pw2, r3, 28.6320, 77.2170, pw_start::timestamptz + interval '3 days 2 hours', 'inside_geofence', true, pw_start::timestamptz + interval '3 days 2 hours'),
    (cv4, cl_r4_paid, r4, 17.4490, 78.3920, NOW() - interval '1 hour 55 minutes', 'inside_geofence', true, NOW() - interval '1 hour 55 minutes'),
    (cv5, cl_r5_paid, r5, 13.0420, 80.2340, NOW() - interval '1 hour 25 minutes', 'inside_geofence', true, NOW() - interval '1 hour 25 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Payout Ledger (for paid claims only) ─────────────────
  INSERT INTO payout_ledger (claim_id, profile_id, amount_inr, payout_method, status, mock_upi_ref, initiated_at, completed_at, metadata)
  VALUES
    (cl1, r1, 200, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R1001', NOW() - interval '4 hours 48 minutes', NOW() - interval '4 hours 47 minutes', '{"source":"auto_adjudicator"}'),
    (cl2, r2, 152, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R2001', NOW() - interval '20 hours 55 minutes', NOW() - interval '20 hours 54 minutes', '{"source":"auto_adjudicator"}'),
    (cl3, r3, 100, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R3001', NOW() - interval '44 hours 55 minutes', NOW() - interval '44 hours 54 minutes', '{"source":"auto_adjudicator"}'),
    (cl_pw1, r2, 250, 'upi_instant', 'completed', 'UPI/OAS/PW/R2001', pw_start::timestamptz + interval '5 days', pw_start::timestamptz + interval '5 days 30 minutes', '{"source":"auto_adjudicator"}'),
    (cl_pw2, r3, 169, 'upi_instant', 'completed', 'UPI/OAS/PW/R3001', pw_start::timestamptz + interval '3 days 1 hour', pw_start::timestamptz + interval '3 days 2 hours', '{"source":"auto_adjudicator"}'),
    (cl_r4_paid, r4, 150, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R4001', NOW() - interval '1 hour 50 minutes', NOW() - interval '1 hour 49 minutes', '{"source":"auto_adjudicator"}'),
    (cl_r5_paid, r5, 150, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R5001', NOW() - interval '1 hour 20 minutes', NOW() - interval '1 hour 19 minutes', '{"source":"auto_adjudicator"}')
  ON CONFLICT DO NOTHING;

  -- ─── Premium Recommendations (next week) ─────────────────
  INSERT INTO premium_recommendations (id, profile_id, week_start_date, recommended_premium_inr, historical_event_count, forecast_risk_factor, created_at)
  VALUES
    (pr1, r1, ws + 7,  89, 3, 0.35, NOW()),
    (pr2, r2, ws + 7, 159, 5, 0.62, NOW()),
    (pr3, r3, ws + 7,  69, 4, 0.55, NOW()),
    (pr4, r4, ws + 7,  79, 2, 0.28, NOW()),
    (pr5, r5, ws + 7, 139, 3, 0.48, NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ─── Rider Notifications (payouts, reminders, system) ───
  INSERT INTO rider_notifications (profile_id, title, body, type, metadata, created_at)
  VALUES
    (r1, 'Claim paid — ₹200 credited', 'Traffic gridlock in your zone. Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl1, 'amount_inr', 200, 'subtype', 'traffic_gridlock'), NOW() - interval '4 hours 47 minutes'),
    (r2, 'Claim paid — ₹152 credited', 'Heavy rain in your zone. Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl2, 'amount_inr', 152, 'subtype', 'heavy_rain'), NOW() - interval '20 hours 54 minutes'),
    (r3, 'Claim paid — ₹100 credited', 'Extreme heat in your zone. Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl3, 'amount_inr', 100, 'subtype', 'extreme_heat'), NOW() - interval '44 hours 54 minutes'),
    (r4, 'Claim created — verify location', 'Zone curfew in your zone. Verify your location within 48h to receive payout.', 'payout', jsonb_build_object('claim_id', cl4, 'amount_inr', 700, 'subtype', 'zone_curfew'), NOW() - interval '10 hours'),
    (r2, 'Claim held for review', 'Unusual activity detected on your account. Our team is reviewing before payout.', 'payout', jsonb_build_object('claim_id', cl_flag, 'amount_inr', 0, 'subtype', 'fraud_hold'), NOW() - interval '50 minutes'),
    (r3, 'Location check required', 'We could not verify your GPS inside the insured zone. Open the app to resubmit.', 'payout', jsonb_build_object('claim_id', cl_fraud_gps, 'amount_inr', 0, 'subtype', 'gps_mismatch'), NOW() - interval '1 hour 55 minutes'),
    (r2, 'Claim paid — ₹250 credited', 'Heavy rain (last week). Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl_pw1, 'amount_inr', 250), pw_start::timestamptz + interval '5 days'),
    (r3, 'Claim paid — ₹169 credited', 'Severe AQI (last week). Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl_pw2, 'amount_inr', 169), pw_start::timestamptz + interval '3 days 2 hours'),
    (r1, 'Welcome to Oasis!', 'Your income protection is active. We''ll auto-detect disruptions and pay you instantly.', 'system', '{}', NOW() - interval '30 days'),
    (r2, 'Welcome to Oasis!', 'Your income protection is active. We''ll auto-detect disruptions and pay you instantly.', 'system', '{}', NOW() - interval '28 days'),
    (r3, 'Welcome to Oasis!', 'Your income protection is active. We''ll auto-detect disruptions and pay you instantly.', 'system', '{}', NOW() - interval '25 days'),
    (r4, 'Reminder: verify your location', 'You have 36h left to verify your location for zone curfew payout.', 'reminder', jsonb_build_object('claim_id', cl4, 'reminder_hours', 36), NOW()),
    (r4, 'Claim paid — ₹150 credited', 'Heavy rain in your zone. Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl_r4_paid, 'amount_inr', 150, 'subtype', 'heavy_rain'), NOW() - interval '1 hour 49 minutes'),
    (r5, 'Claim paid — ₹150 credited', 'Heavy rain in your zone. Payout credited to your wallet.', 'payout', jsonb_build_object('claim_id', cl_r5_paid, 'amount_inr', 150, 'subtype', 'heavy_rain'), NOW() - interval '1 hour 19 minutes')
  ON CONFLICT DO NOTHING;

  -- ─── Rider Delivery Reports (self-reports) ────────────────
  INSERT INTO rider_delivery_reports (profile_id, zone_lat, zone_lng, report_type, message, photo_url, created_at)
  VALUES
    (r2, 19.1136, 72.8697, 'cant_deliver',
     'Heavy waterlogging near Andheri station. Roads completely submerged, two-wheelers cannot pass. Multiple delivery partners stranded.',
     NULL, NOW() - interval '2 days'),
    (r4, 17.4483, 78.3915, 'cant_deliver',
     'Bandh in Hyderabad — main roads blocked. Unable to complete deliveries in Madhapur zone.',
     NULL, NOW() - interval '2 days 3 hours')
  ON CONFLICT DO NOTHING;

  -- ─── Payment Transactions (Razorpay-shaped IDs for admin Payment Logs) ─
  INSERT INTO payment_transactions (id, profile_id, weekly_policy_id, amount_inr, status, razorpay_order_id, razorpay_payment_id, razorpay_payment_method, paid_at, created_at)
  VALUES
    (gen_random_uuid(), r1, pol1,  99, 'paid', 'order_DemoR1Ws' || substring(md5('r1'||ws::text) from 1 for 8), 'pay_DemoR1Ws' || substring(md5('r1p'||ws::text) from 1 for 8), 'upi', ws::timestamptz + interval '1 hour', ws::timestamptz + interval '1 hour'),
    (gen_random_uuid(), r2, pol2, 199, 'paid', 'order_DemoR2Ws' || substring(md5('r2'||ws::text) from 1 for 8), 'pay_DemoR2Ws' || substring(md5('r2p'||ws::text) from 1 for 8), 'card', ws::timestamptz + interval '2 hours', ws::timestamptz + interval '2 hours'),
    (gen_random_uuid(), r3, pol3,  49, 'paid', 'order_DemoR3Ws' || substring(md5('r3'||ws::text) from 1 for 8), 'pay_DemoR3Ws' || substring(md5('r3p'||ws::text) from 1 for 8), 'upi', ws::timestamptz + interval '3 hours', ws::timestamptz + interval '3 hours'),
    (gen_random_uuid(), r4, pol4,  99, 'paid', 'order_DemoR4Ws' || substring(md5('r4'||ws::text) from 1 for 8), 'pay_DemoR4Ws' || substring(md5('r4p'||ws::text) from 1 for 8), 'upi', ws::timestamptz + interval '4 hours', ws::timestamptz + interval '4 hours'),
    (gen_random_uuid(), r5, pol5, 199, 'paid', 'order_DemoR5Ws' || substring(md5('r5'||ws::text) from 1 for 8), 'pay_DemoR5Ws' || substring(md5('r5p'||ws::text) from 1 for 8), 'card', ws::timestamptz + interval '5 hours', ws::timestamptz + interval '5 hours'),
    (gen_random_uuid(), r1, pol_pw1,  99, 'paid', 'order_DemoR1Pw', 'pay_DemoR1Pw', 'upi', pw_start::timestamptz + interval '1 day', pw_start::timestamptz + interval '1 day'),
    (gen_random_uuid(), r2, pol_pw2, 199, 'paid', 'order_DemoR2Pw', 'pay_DemoR2Pw', 'upi', pw_start::timestamptz + interval '1 day', pw_start::timestamptz + interval '1 day'),
    (gen_random_uuid(), r3, pol_pw3,  49, 'paid', 'order_DemoR3Pw', 'pay_DemoR3Pw', 'card', pw_start::timestamptz + interval '1 day', pw_start::timestamptz + interval '1 day'),
    (gen_random_uuid(), r4, pol_pw4,  99, 'paid', 'order_DemoR4Pw', 'pay_DemoR4Pw', 'upi', pw_start::timestamptz + interval '1 day', pw_start::timestamptz + interval '1 day'),
    (gen_random_uuid(), r5, pol_pw5, 199, 'paid', 'order_DemoR5Pw', 'pay_DemoR5Pw', 'card', pw_start::timestamptz + interval '1 day', pw_start::timestamptz + interval '1 day')
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
    AND wp.id IN (pol1, pol2, pol3, pol4, pol5, pol_pw1, pol_pw2, pol_pw3, pol_pw4, pol_pw5);

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
  RAISE NOTICE '   Current week: premium ₹645, paid claims ₹452 → loss ratio ~70%%';
  RAISE NOTICE '   Fraud queue: 3 flagged (all reviewed) — see /admin/fraud';
  RAISE NOTICE '   5 riders | 12 disruption events (incl. last-24h density) | Razorpay refs on policies';
  RAISE NOTICE '   Login: rahul.demo@oasis.app / Demo@1234';

END $$;
