# Payments – Stripe only

Oasis uses **Stripe** for subscription payments. Razorpay is not used.

## Active gateway

| Gateway  | Status   | Use |
|----------|----------|-----|
| **Stripe** | Active   | Checkout (Create Checkout Session), webhooks (payment success), `payment_transactions` and `weekly_policies.stripe_*` columns |
| Razorpay | Deprecated | DB columns (`razorpay_order_id`, `razorpay_payment_id` on `weekly_policies` and `payment_transactions`) remain for legacy data only. No code paths use Razorpay. |

## Required env vars

- `STRIPE_SECRET_KEY` – Stripe API secret (e.g. `sk_test_...`).
- `STRIPE_WEBHOOK_SECRET` – Webhook signing secret (e.g. `whsec_...` from Stripe CLI or Dashboard).
- Optional: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – For future client-side Stripe usage.

## Flows

1. **Subscribe (weekly policy)** – `POST /api/payments/create-checkout` creates a Stripe Checkout Session; success updates `weekly_policies` with `stripe_checkout_session_id` / `stripe_payment_intent_id` and `payment_status = 'paid'`, and inserts `payment_transactions`.
2. **Webhook** – `POST /api/payments/webhook` handles `checkout.session.completed` and `payment_intent.succeeded`, updates policy and inserts/updates `payment_transactions`.
3. **Simulate payout** – `POST /api/payments/simulate-payout` writes to `payout_ledger` (demo/simulated UPI); gateway in metadata is `stripe_connect` for consistency.

See the docs site (Development Setup, Deployment) for Stripe CLI and production webhook setup.
