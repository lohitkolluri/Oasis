-- =============================================================================
-- Cleanup legacy / noisy payment rows (test & demo DBs only)
-- =============================================================================
-- You cannot "migrate" Stripe or fake demo IDs into Razorpay payment IDs —
-- Razorpay issues pay_... only when a real payment completes. Old rows are
-- either seed data, abandoned checkouts (pending), or pre-Razorpay captures.
--
-- Run in Supabase SQL Editor (Dashboard → SQL). Review each block; comment out
-- what you do not want. Prefer a backup or project branch before mass DELETE.
-- =============================================================================

BEGIN;

-- A) Remove "paid" audit rows that have no Razorpay payment id (demo/Stripe era).
--    Does not delete weekly_policies; those may still exist for claims history.
--    Safe if you only care about Payment Logs matching Razorpay.
DELETE FROM payment_transactions
WHERE status = 'paid'
  AND (razorpay_payment_id IS NULL OR btrim(razorpay_payment_id) = '');

-- B) Remove stale abandoned checkouts (pending older than 24h — no Razorpay completion).
--    Comment out this block if you need to keep very recent pending rows for debugging.
DELETE FROM payment_transactions
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours';

-- C) Optional: drop failed attempts (uncomment if desired).
-- DELETE FROM payment_transactions WHERE status = 'failed';

-- Aggressive: delete every pending row (any age). Use only if you are sure no checkout is in flight.
-- DELETE FROM payment_transactions WHERE status = 'pending';

COMMIT;

-- =============================================================================
-- Full reset (policies + payments + claims tied to policies)
-- =============================================================================
-- If you want a completely clean slate for checkout testing, use instead:
--   scripts/reset-payment-for-verification.sql
-- (deletes all payment_transactions and weekly_policies; claims CASCADE with policies)
--
-- To re-seed demo riders/policies/payments with Razorpay-shaped IDs:
--   scripts/seed-demo-data.sql
-- =============================================================================
