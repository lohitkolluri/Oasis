---
title: Supabase Integrations
description: pg_cron, Razorpay webhooks, Queues
---

Several Supabase integrations reduce external dependencies and improve reliability.

---

## Cron (pg_cron)

**Status:** Implemented

Cron jobs run inside Postgres via `pg_cron` and call the Next.js API using `pg_net`. See [Deployment → Option C: Supabase Cron](/deployment#option-c-supabase-cron-recommended).

---

## Razorpay (payments)

**Status:** Implemented

Oasis uses **Razorpay Standard Checkout** for weekly premium payments in **INR**. The client opens the hosted Checkout modal; on success, **`POST /api/payments/verify`** confirms the signature and activates coverage. An optional **`POST /api/payments/webhook`** handles Razorpay `payment.captured` events for the same idempotent processing path.

For local demos without real charges, use **test mode** keys and follow **[Demo payments](/demo-payments/)**.

### Querying payment data in Postgres

Premium and payment rows live in Oasis tables (`weekly_policies`, `payment_transactions`, `razorpay_payment_events`). You can join them in SQL for reporting; no foreign-data wrapper is required for core flows.

---

## Queues

**Status:** Future enhancement

Supabase Queues could be used for async gov ID verification, batch premium calculation, or fraud review pipelines. See the Queues integration in the Dashboard.
