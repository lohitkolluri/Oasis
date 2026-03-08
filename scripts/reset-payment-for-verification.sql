-- Reset payment data to re-run Stripe checkout verification
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query

-- Resets: payment_transactions, weekly_policies (parametric_claims CASCADE)
-- After running: rider can subscribe again and go through full Checkout flow

BEGIN;

DELETE FROM payment_transactions;
DELETE FROM weekly_policies;

COMMIT;

-- For single-user reset only, use instead:
-- DELETE FROM payment_transactions WHERE profile_id = 'YOUR_PROFILE_UUID'::uuid;
-- DELETE FROM weekly_policies WHERE profile_id = 'YOUR_PROFILE_UUID'::uuid;
-- (Get UUID from profiles.id or auth.users.id)
