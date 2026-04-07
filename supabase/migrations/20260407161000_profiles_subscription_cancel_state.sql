-- Track subscription cancellation state to avoid orphaned DB/provider mismatches.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS razorpay_cancel_status TEXT NOT NULL DEFAULT 'none'
    CHECK (razorpay_cancel_status IN ('none', 'pending', 'cancelled')),
  ADD COLUMN IF NOT EXISTS razorpay_cancel_requested_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.razorpay_cancel_status IS
  'Cancellation state for Razorpay subscription (none|pending|cancelled). Used to ensure DB/provider consistency.';

COMMENT ON COLUMN public.profiles.razorpay_cancel_requested_at IS
  'Timestamp when rider requested Razorpay subscription cancellation.';
