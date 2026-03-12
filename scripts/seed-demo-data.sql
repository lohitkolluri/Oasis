-- ============================================================
-- Seed Demo Data for Oasis Parametric Insurance Platform
--
-- Creates 5 demo riders across Indian metros with:
--   - Active policies for the current week
--   - Disruption events (all trigger subtypes)
--   - Claims (paid, pending_verification, flagged)
--   - Location verifications and payouts
--   - Notifications and premium recommendations
--   - A rider self-report
--
-- How to run:
--   Supabase Dashboard → SQL Editor → paste this file → Run
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

  -- Event UUIDs
  ev_heat    UUID := 'e1e1e1e1-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  ev_rain_m  UUID := 'e2e2e2e2-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  ev_aqi     UUID := 'e3e3e3e3-cccc-4ccc-8ccc-cccccccccccc';
  ev_traffic UUID := 'e4e4e4e4-dddd-4ddd-8ddd-dddddddddddd';
  ev_curfew  UUID := 'e5e5e5e5-eeee-4eee-8eee-eeeeeeeeeeee';
  ev_rain_c  UUID := 'e6e6e6e6-ffff-4fff-8fff-ffffffffffff';
  ev_heat2   UUID := 'e7e7e7e7-1111-4111-8111-111111111111';

  -- Policy UUIDs
  pol1 UUID := 'f1f1f1f1-1111-4111-8111-111111111111';
  pol2 UUID := 'f2f2f2f2-2222-4222-8222-222222222222';
  pol3 UUID := 'f3f3f3f3-3333-4333-8333-333333333333';
  pol4 UUID := 'f4f4f4f4-4444-4444-8444-444444444444';
  pol5 UUID := 'f5f5f5f5-5555-4555-8555-555555555555';

  -- Claim UUIDs
  cl1 UUID := 'c1010101-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  cl2 UUID := 'c2020202-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  cl3 UUID := 'c3030303-cccc-4ccc-8ccc-cccccccccccc';
  cl4 UUID := 'c4040404-dddd-4ddd-8ddd-dddddddddddd';
  cl5 UUID := 'c5050505-eeee-4eee-8eee-eeeeeeeeeeee';
  cl6 UUID := 'c6060606-ffff-4fff-8fff-ffffffffffff';
  cl7 UUID := 'c7070707-1111-4111-8111-111111111111';

  -- Plan IDs (looked up)
  plan_basic    UUID;
  plan_standard UUID;
  plan_premium  UUID;

  -- Dynamic dates
  ws  DATE := date_trunc('week', NOW())::DATE; -- Monday of current week
  we  DATE;
  pw_start DATE; -- Previous week start
  pw_end   DATE;

  hashed_pw TEXT;
BEGIN
  we := ws + 6;
  pw_start := ws - 7;
  pw_end := ws - 1;
  hashed_pw := crypt('Demo@1234', gen_salt('bf'));

  -- ─── Clean up previous demo data (safe re-run) ───────────
  DELETE FROM rider_notifications    WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM payout_ledger          WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM claim_verifications    WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM parametric_claims      WHERE id IN (cl1, cl2, cl3, cl4, cl5, cl6, cl7);
  DELETE FROM payment_transactions   WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM weekly_policies        WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM premium_recommendations WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM rider_delivery_reports WHERE profile_id IN (r1, r2, r3, r4, r5);
  DELETE FROM live_disruption_events WHERE id IN (ev_heat, ev_rain_m, ev_aqi, ev_traffic, ev_curfew, ev_rain_c, ev_heat2);
  DELETE FROM profiles               WHERE id IN (r1, r2, r3, r4, r5);

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

  -- ─── Auth users (demo accounts) ──────────────────────────
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    (r1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rahul.demo@oasis.app',  hashed_pw, NOW() - interval '30 days', NOW() - interval '30 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rahul Sharma"}',  false, '', '', '', ''),
    (r2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya.demo@oasis.app',  hashed_pw, NOW() - interval '28 days', NOW() - interval '28 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Patel"}',   false, '', '', '', ''),
    (r3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'amit.demo@oasis.app',   hashed_pw, NOW() - interval '25 days', NOW() - interval '25 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amit Kumar"}',    false, '', '', '', ''),
    (r4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sneha.demo@oasis.app',  hashed_pw, NOW() - interval '20 days', NOW() - interval '20 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sneha Reddy"}',   false, '', '', '', ''),
    (r5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vijay.demo@oasis.app',  hashed_pw, NOW() - interval '18 days', NOW() - interval '18 days', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vijay Singh"}',   false, '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- Auth identities (required for email login)
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (r1, r1, jsonb_build_object('sub', r1::text, 'email', 'rahul.demo@oasis.app'), 'email', r1::text, NOW(), NOW() - interval '30 days', NOW()),
    (r2, r2, jsonb_build_object('sub', r2::text, 'email', 'priya.demo@oasis.app'), 'email', r2::text, NOW(), NOW() - interval '28 days', NOW()),
    (r3, r3, jsonb_build_object('sub', r3::text, 'email', 'amit.demo@oasis.app'),  'email', r3::text, NOW(), NOW() - interval '25 days', NOW()),
    (r4, r4, jsonb_build_object('sub', r4::text, 'email', 'sneha.demo@oasis.app'), 'email', r4::text, NOW(), NOW() - interval '20 days', NOW()),
    (r5, r5, jsonb_build_object('sub', r5::text, 'email', 'vijay.demo@oasis.app'), 'email', r5::text, NOW(), NOW() - interval '18 days', NOW())
  ON CONFLICT DO NOTHING;

  -- ─── Profiles ─────────────────────────────────────────────
  -- City coordinates:
  --   Bangalore Koramangala: 12.9352, 77.6245
  --   Mumbai Andheri:        19.1136, 72.8697
  --   Delhi Connaught Place: 28.6315, 77.2167
  --   Hyderabad Madhapur:    17.4483, 78.3915
  --   Chennai T Nagar:       13.0418, 80.2341
  INSERT INTO profiles (id, full_name, phone_number, platform, zone_latitude, zone_longitude, role, government_id_verified, face_verified, primary_zone_geofence)
  VALUES
    (r1, 'Rahul Sharma', '+919876543210', 'zepto',   12.9352, 77.6245, 'rider', true, true, '{"type":"circle","lat":12.9352,"lng":77.6245,"radius_km":5}'),
    (r2, 'Priya Patel',  '+919876543211', 'blinkit', 19.1136, 72.8697, 'rider', true, true, '{"type":"circle","lat":19.1136,"lng":72.8697,"radius_km":5}'),
    (r3, 'Amit Kumar',   '+919876543212', 'zepto',   28.6315, 77.2167, 'rider', true, true, '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":5}'),
    (r4, 'Sneha Reddy',  '+919876543213', 'blinkit', 17.4483, 78.3915, 'rider', true, true, '{"type":"circle","lat":17.4483,"lng":78.3915,"radius_km":5}'),
    (r5, 'Vijay Singh',  '+919876543214', 'zepto',   13.0418, 80.2341, 'rider', true, true, '{"type":"circle","lat":13.0418,"lng":80.2341,"radius_km":5}')
  ON CONFLICT (id) DO UPDATE SET
    full_name              = EXCLUDED.full_name,
    phone_number           = EXCLUDED.phone_number,
    platform               = EXCLUDED.platform,
    zone_latitude          = EXCLUDED.zone_latitude,
    zone_longitude         = EXCLUDED.zone_longitude,
    government_id_verified = EXCLUDED.government_id_verified,
    face_verified          = EXCLUDED.face_verified,
    primary_zone_geofence  = EXCLUDED.primary_zone_geofence;

  -- ─── Disruption Events (all subtypes) ────────────────────
  INSERT INTO live_disruption_events (id, event_type, event_subtype, severity_score, geofence_polygon, verified_by_llm, raw_api_data, created_at)
  VALUES
    -- Extreme heat in Delhi (2 days ago)
    (ev_heat, 'weather', 'extreme_heat', 8.5,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":15}',
     false,
     '{"trigger":"extreme_heat","source":"tomorrow_io","temperature":45.2,"feels_like":48.1}',
     NOW() - interval '2 days'),

    -- Heavy rain in Mumbai (1 day ago)
    (ev_rain_m, 'weather', 'heavy_rain', 9.0,
     '{"type":"circle","lat":19.1136,"lng":72.8697,"radius_km":15}',
     false,
     '{"trigger":"heavy_rain","source":"open_meteo","precipitationIntensity":12.5,"humidity":95}',
     NOW() - interval '1 day'),

    -- Severe AQI in Delhi (3 days ago)
    (ev_aqi, 'weather', 'severe_aqi', 7.5,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":20}',
     false,
     '{"trigger":"severe_aqi","source":"waqi","current_aqi":312,"adaptive_threshold":201}',
     NOW() - interval '3 days'),

    -- Traffic gridlock in Bangalore (6 hours ago)
    (ev_traffic, 'traffic', 'traffic_gridlock', 8.0,
     '{"type":"circle","lat":12.9352,"lng":77.6245,"radius_km":15}',
     true,
     '{"trigger":"traffic_gridlock","source":"tomtom_traffic","sample_points":5,"congested_points":4,"avg_ratio":0.18,"has_road_closure":false}',
     NOW() - interval '6 hours'),

    -- Zone curfew in Hyderabad (4 days ago, from bandh)
    (ev_curfew, 'social', 'zone_curfew', 9.0,
     '{"type":"circle","lat":17.4483,"lng":78.3915,"radius_km":20}',
     true,
     '{"trigger":"zone_curfew","source":"newsdata_llm","articles":[{"title":"Telangana bandh: shops shut, roads empty in Hyderabad"}],"llm":{"qualifies":true,"severity":9,"zone":"Hyderabad"}}',
     NOW() - interval '4 days'),

    -- Heavy rain in Chennai (3 hours ago)
    (ev_rain_c, 'weather', 'heavy_rain', 8.0,
     '{"type":"circle","lat":13.0418,"lng":80.2341,"radius_km":15}',
     false,
     '{"trigger":"heavy_rain","source":"open_meteo","precipitationIntensity":8.3,"humidity":92}',
     NOW() - interval '3 hours'),

    -- Previous week: heat wave in Delhi
    (ev_heat2, 'weather', 'extreme_heat', 7.0,
     '{"type":"circle","lat":28.6315,"lng":77.2167,"radius_km":15}',
     false,
     '{"trigger":"extreme_heat","source":"tomorrow_io","temperature":43.8}',
     NOW() - interval '9 days')

  ON CONFLICT (id) DO NOTHING;

  -- ─── Weekly Policies (current week, all riders active) ───
  INSERT INTO weekly_policies (id, profile_id, plan_id, week_start_date, week_end_date, weekly_premium_inr, is_active, created_at)
  VALUES
    (pol1, r1, plan_standard, ws, we,  99, true, ws::timestamptz),
    (pol2, r2, plan_premium,  ws, we, 199, true, ws::timestamptz),
    (pol3, r3, plan_basic,    ws, we,  49, true, ws::timestamptz),
    (pol4, r4, plan_standard, ws, we,  99, true, ws::timestamptz),
    (pol5, r5, plan_premium,  ws, we, 199, true, ws::timestamptz)
  ON CONFLICT (id) DO NOTHING;

  -- ─── Parametric Claims ───────────────────────────────────
  -- cl1: Rahul, traffic gridlock, PAID (verified)
  -- cl2: Priya, heavy rain Mumbai, PAID
  -- cl3: Amit, extreme heat Delhi, PAID
  -- cl4: Amit, severe AQI Delhi, pending_verification
  -- cl5: Sneha, zone curfew Hyderabad, PAID
  -- cl6: Vijay, heavy rain Chennai, pending_verification (just created)
  -- cl7: Priya, rain again, FLAGGED (rapid claims demo)
  INSERT INTO parametric_claims (id, policy_id, disruption_event_id, payout_amount_inr, status, is_flagged, flag_reason, gateway_transaction_id, created_at)
  VALUES
    (cl1, pol1, ev_traffic, 700,  'paid',                 false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_' || substring(cl1::text, 1, 8),
     NOW() - interval '5 hours'),

    (cl2, pol2, ev_rain_m, 1500, 'paid',                  false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_' || substring(cl2::text, 1, 8),
     NOW() - interval '22 hours'),

    (cl3, pol3, ev_heat,    300,  'paid',                  false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_' || substring(cl3::text, 1, 8),
     NOW() - interval '46 hours'),

    (cl4, pol3, ev_aqi,     300,  'pending_verification',  false, NULL,  NULL,
     NOW() - interval '10 hours'),

    (cl5, pol4, ev_curfew,  700,  'paid',                  false, NULL,
     'oasis_verify_' || extract(epoch from NOW())::bigint || '_' || substring(cl5::text, 1, 8),
     NOW() - interval '90 hours'),

    (cl6, pol5, ev_rain_c, 1500, 'pending_verification',  false, NULL,  NULL,
     NOW() - interval '2 hours'),

    (cl7, pol2, ev_rain_c, 1500, 'pending_verification',  true,
     'Rapid claims: 5 in 24h (threshold 5)',
     NULL,
     NOW() - interval '1 hour')

  ON CONFLICT (id) DO NOTHING;

  -- ─── Claim Verifications (for paid claims) ───────────────
  INSERT INTO claim_verifications (claim_id, profile_id, verified_lat, verified_lng, verified_at, status, declaration_confirmed, declaration_at)
  VALUES
    (cl1, r1, 12.9360, 77.6250, NOW() - interval '4 hours 50 minutes', 'inside_geofence', true, NOW() - interval '4 hours 50 minutes'),
    (cl2, r2, 19.1140, 72.8700, NOW() - interval '21 hours',          'inside_geofence', true, NOW() - interval '21 hours'),
    (cl3, r3, 28.6320, 77.2170, NOW() - interval '45 hours',          'inside_geofence', true, NOW() - interval '45 hours'),
    (cl5, r4, 17.4490, 78.3920, NOW() - interval '89 hours',          'inside_geofence', true, NOW() - interval '89 hours')
  ON CONFLICT (claim_id, profile_id) DO NOTHING;

  -- ─── Payout Ledger (for paid claims) ─────────────────────
  INSERT INTO payout_ledger (claim_id, profile_id, amount_inr, payout_method, status, mock_upi_ref, initiated_at, completed_at, metadata)
  VALUES
    (cl1, r1,  700, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R1001', NOW() - interval '4 hours 48 minutes', NOW() - interval '4 hours 47 minutes', '{"source":"auto_adjudicator"}'),
    (cl2, r2, 1500, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R2001', NOW() - interval '20 hours 55 minutes', NOW() - interval '20 hours 54 minutes', '{"source":"auto_adjudicator"}'),
    (cl3, r3,  300, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R3001', NOW() - interval '44 hours 55 minutes', NOW() - interval '44 hours 54 minutes', '{"source":"auto_adjudicator"}'),
    (cl5, r4,  700, 'upi_instant', 'completed', 'UPI/OAS/' || to_char(NOW(), 'YYYYMMDD') || '/R4001', NOW() - interval '88 hours 55 minutes', NOW() - interval '88 hours 54 minutes', '{"source":"auto_adjudicator"}');

  -- ─── Premium Recommendations (next week) ─────────────────
  INSERT INTO premium_recommendations (profile_id, week_start_date, recommended_premium_inr, historical_event_count, forecast_risk_factor, created_at)
  VALUES
    (r1, ws + 7,  89, 3, 0.35, NOW()),
    (r2, ws + 7, 159, 5, 0.62, NOW()),
    (r3, ws + 7,  69, 4, 0.55, NOW()),
    (r4, ws + 7,  79, 2, 0.28, NOW()),
    (r5, ws + 7, 139, 3, 0.48, NOW())
  ON CONFLICT (profile_id, week_start_date) DO NOTHING;

  -- ─── Rider Notifications ─────────────────────────────────
  INSERT INTO rider_notifications (profile_id, title, body, type, metadata, created_at)
  VALUES
    -- Rahul: traffic gridlock claim paid
    (r1, 'Claim paid — ₹700 credited',
     'Traffic gridlock in your zone. Payout credited to your wallet.',
     'payout', jsonb_build_object('claim_id', cl1, 'amount_inr', 700, 'subtype', 'traffic_gridlock'),
     NOW() - interval '4 hours 47 minutes'),

    -- Priya: rain claim paid
    (r2, 'Claim paid — ₹1,500 credited',
     'Heavy rain in your zone. Payout credited to your wallet.',
     'payout', jsonb_build_object('claim_id', cl2, 'amount_inr', 1500, 'subtype', 'heavy_rain'),
     NOW() - interval '20 hours 54 minutes'),

    -- Amit: heat claim paid
    (r3, 'Claim paid — ₹300 credited',
     'Extreme heat in your zone. Payout credited to your wallet.',
     'payout', jsonb_build_object('claim_id', cl3, 'amount_inr', 300, 'subtype', 'extreme_heat'),
     NOW() - interval '44 hours 54 minutes'),

    -- Amit: AQI claim pending verification
    (r3, 'Claim created — verify location',
     'Severe AQI in your zone. Verify your location within 48h to receive ₹300.',
     'payout', jsonb_build_object('claim_id', cl4, 'amount_inr', 300, 'subtype', 'severe_aqi'),
     NOW() - interval '10 hours'),

    -- Sneha: curfew claim paid
    (r4, 'Claim paid — ₹700 credited',
     'Zone curfew in your zone. Payout credited to your wallet.',
     'payout', jsonb_build_object('claim_id', cl5, 'amount_inr', 700, 'subtype', 'zone_curfew'),
     NOW() - interval '88 hours 54 minutes'),

    -- Vijay: rain claim pending
    (r5, 'Claim created — verify location',
     'Heavy rain in your zone. Verify your location within 48h to receive ₹1,500.',
     'payout', jsonb_build_object('claim_id', cl6, 'amount_inr', 1500, 'subtype', 'heavy_rain'),
     NOW() - interval '2 hours'),

    -- Vijay: reminder notification
    (r5, 'Reminder: verify your location',
     'You have 36h left to verify your location for ₹1,500 payout.',
     'reminder', jsonb_build_object('claim_id', cl6, 'amount_inr', 1500, 'reminder_hours', 12),
     NOW()),

    -- Priya: flagged claim notification
    (r2, 'Claim flagged for review',
     'A recent claim was flagged by our fraud detection system. If this is an error, contact support.',
     'system', jsonb_build_object('claim_id', cl7, 'reason', 'rapid_claims'),
     NOW() - interval '55 minutes'),

    -- System: welcome notifications
    (r1, 'Welcome to Oasis!',
     'Your income protection is active. We''ll auto-detect disruptions and pay you instantly.',
     'system', '{}', NOW() - interval '30 days'),
    (r2, 'Welcome to Oasis!',
     'Your income protection is active. We''ll auto-detect disruptions and pay you instantly.',
     'system', '{}', NOW() - interval '28 days');

  -- ─── Rider Delivery Report (self-report demo) ────────────
  INSERT INTO rider_delivery_reports (profile_id, zone_lat, zone_lng, report_type, message, photo_url, created_at)
  VALUES
    (r2, 19.1136, 72.8697, 'cant_deliver',
     'Heavy waterlogging near Andheri station. Roads completely submerged, two-wheelers cannot pass. Multiple delivery partners stranded.',
     NULL,
     NOW() - interval '23 hours');

  -- ─── Payment Transactions (Stripe checkout records) ──────
  INSERT INTO payment_transactions (id, profile_id, weekly_policy_id, amount_inr, status, stripe_checkout_session_id, stripe_payment_intent_id, paid_at, created_at)
  VALUES
    (gen_random_uuid(), r1, pol1,  99, 'paid', 'cs_demo_rahul_' || extract(epoch from NOW())::bigint, 'pi_demo_rahul',  ws::timestamptz + interval '1 hour 5 minutes', ws::timestamptz + interval '1 hour'),
    (gen_random_uuid(), r2, pol2, 199, 'paid', 'cs_demo_priya_' || extract(epoch from NOW())::bigint, 'pi_demo_priya',  ws::timestamptz + interval '2 hours 3 minutes', ws::timestamptz + interval '2 hours'),
    (gen_random_uuid(), r3, pol3,  49, 'paid', 'cs_demo_amit_' || extract(epoch from NOW())::bigint,  'pi_demo_amit',   ws::timestamptz + interval '3 hours 2 minutes', ws::timestamptz + interval '3 hours'),
    (gen_random_uuid(), r4, pol4,  99, 'paid', 'cs_demo_sneha_' || extract(epoch from NOW())::bigint, 'pi_demo_sneha',  ws::timestamptz + interval '4 hours 4 minutes', ws::timestamptz + interval '4 hours'),
    (gen_random_uuid(), r5, pol5, 199, 'paid', 'cs_demo_vijay_' || extract(epoch from NOW())::bigint, 'pi_demo_vijay',  ws::timestamptz + interval '5 hours 1 minute',  ws::timestamptz + interval '5 hours');

  RAISE NOTICE '✅ Demo data seeded successfully!';
  RAISE NOTICE '   5 riders | 7 events | 5 policies | 7 claims | 4 payouts';
  RAISE NOTICE '   Login: rahul.demo@oasis.app / Demo@1234';

END $$;
