-- Reset subscription / payment state for one user so they can subscribe again.
-- Does NOT delete the auth user or profile (only policies + payment rows).
--
-- How to run (pick one):
--   1. Supabase Dashboard → SQL Editor → paste → Run
--   2. VS Code / Cursor Supabase extension: open this file → run against linked project
--
-- Change the email below if needed.

BEGIN;

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower('admin@oasis.com') LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for that email';
  END IF;

  -- Children of weekly_policies (e.g. parametric_claims) CASCADE on policy delete.
  DELETE FROM payment_transactions WHERE profile_id = uid;
  DELETE FROM weekly_policies WHERE profile_id = uid;

  RAISE NOTICE 'Cleared weekly_policies + payment_transactions for % (%)', 'admin@oasis.com', uid;
END $$;

COMMIT;
