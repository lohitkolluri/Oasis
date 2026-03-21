---
title: Supabase Integrations
description: pg_cron, Stripe, Queues
---

Several Supabase integrations reduce external dependencies and improve reliability.

---

## Cron (pg_cron)

**Status:** Implemented

Cron jobs run inside Postgres via `pg_cron` and call the Next.js API using `pg_net`. See [Deployment → Option C: Supabase Cron](/deployment#option-c-supabase-cron-recommended).

---

## Stripe (payments)

**Status:** Implemented

Oasis uses **Stripe** for weekly premium payments. Stripe Checkout handles the payment flow (INR) with **card** and **UPI**; eligible customers may also see **Google Pay** on the card path. The webhook at `/api/payments/webhook` activates policies on success.

### Supabase Stripe Wrapper (optional)

The [Stripe Wrapper](https://supabase.com/integrations/stripe_wrapper) integration lets you query Stripe data from Postgres via Foreign Data Wrapper (FDW).

**Setup:**
1. Supabase Dashboard → Integrations → Stripe Wrapper → Install
2. Add your Stripe API key when prompted
3. Query Stripe data from SQL, e.g. `SELECT * FROM stripe_wrapper.payments`

Useful for joining payment data with `profiles`, `weekly_policies` for reporting and analytics.

### Stripe Sync Engine (optional)

The [Stripe Sync Engine](https://supabase.com/integrations/stripe-sync-engine) syncs Stripe customers, payments, and subscriptions into a `stripe` schema. Install from Integrations for deeper reporting.

---

## Queues

**Status:** Future enhancement

Supabase Queues could be used for async gov ID verification, batch premium calculation, or fraud review pipelines. See the Queues integration in the Dashboard.
