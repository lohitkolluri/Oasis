# Oasis

**AI-powered parametric wage protection for India's Q-commerce delivery partners.**

Oasis safeguards gig workers (Zepto, Blinkit) against income loss caused by external disruptions — extreme weather, zone lockdowns, and traffic gridlock — through automated, zero-touch payouts and weekly pricing aligned to their earnings cycle.

> Coverage is strictly for **loss of income only** — no health, life, accident, or vehicle repair coverage.

---

## Documentation

Full developer documentation is in the [`/docs`](./docs) folder (Astro Starlight).

| Section                                                                | Description                             |
| ---------------------------------------------------------------------- | --------------------------------------- |
| [Onboarding](./docs/src/content/docs/features/onboarding.md)           | Two-step KYC: gov ID + face verification |
| [Architecture](./docs/src/content/docs/architecture.md)                | System design, data flow, key modules   |
| [Development Setup](./docs/src/content/docs/development-setup.md)       | Local setup, env vars, DB migrations    |
| [Parametric Triggers](./docs/src/content/docs/features/parametric-triggers.md) | How the adjudicator works               |
| [Fraud Detection](./docs/src/content/docs/features/fraud-detection.md) | 7-layer fraud check pipeline            |
| [Claims Processing](./docs/src/content/docs/features/claims-processing.md) | End-to-end parametric claims            |
| [Database Schema](./docs/src/content/docs/database.md)                 | All tables, RLS, relationships         |
| [API Reference](./docs/src/content/docs/api.md)                        | Every endpoint, request/response shapes  |
| [Deployment](./docs/src/content/docs/deployment.md)                   | Vercel deployment, cron setup            |
| [Payments (Stripe)](./docs/PAYMENTS.md)                               | Stripe-only; Razorpay deprecated         |
| [Realtime triggers](./docs/REALTIME-TRIGGERS.md)                     | Webhook + 15-min cron for adjudicator    |
| [Refactoring roadmap](./docs/REFACTORING-ROADMAP.md)                 | Phased plan for production-grade quality |
| [Supabase Integrations](./docs/src/content/docs/features/supabase-integrations.md) | Cron, Queues, Stripe options            |

To run the docs site locally:

```bash
cd docs && npm install && npm run dev
```

The docs include `llms.txt`, `llms-full.txt`, and `llms-small.txt` for AI context (via starlight-llms-txt), plus OpenAPI-generated API reference from `openapi.yaml`.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/lohitkolluri/oasis.git
cd oasis && yarn install

# 2. Set up environment variables (do not commit .env.local)
cp .env.local.example .env.local
# Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS, TOMORROW_IO_API_KEY, NEWSDATA_IO_API_KEY,
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CRON_SECRET. Optional: see list below.
# Run: make configure  (or npx tsx scripts/configure-env.ts) to fill interactively.

# 3. Apply database migrations (Supabase Dashboard → SQL Editor, run in order)
#    or via CLI: npx supabase link && yarn db:migrate

# 4. Create storage buckets (rider-reports, government-ids, face-photos)
yarn setup-storage

# 5. Run
yarn dev
```

**Environment variables (do not commit .env.local):**

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `ADMIN_EMAILS` | Yes | Comma-separated admin emails |
| `TOMORROW_IO_API_KEY` | Yes | Weather / triggers |
| `NEWSDATA_IO_API_KEY` | Yes | News / disruption triggers |
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook secret (whsec_...); use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward locally |
| `CRON_SECRET` | Yes (prod) | Random string for /api/cron/*; required in production |
| `WEBHOOK_SECRET` | If using webhook | For POST /api/webhooks/disruption (realtime). No fallback to CRON_SECRET; set when using disruption webhook |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | Canonical app URL (e.g. https://your-app.vercel.app). Required in production for Stripe redirects and links |
| `OPENROUTER_API_KEY` | Yes | LLM (gov ID / face verification) |
| `WAQI_API_KEY` | No | AQI (optional fallback) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key (pk_test_...) |
| `GOV_ID_ENCRYPTION_KEY` | **Production** | 32-byte base64 key; required in production to store government ID images (KYC). Omit in dev to store unencrypted. |
| `FACE_PHOTO_ENCRYPTION_KEY` | **Production** | 32-byte base64 key; required in production to store face verification photos. Falls back to `GOV_ID_ENCRYPTION_KEY` if unset. |

Run `make configure` (or `npx tsx scripts/configure-env.ts`) to set these interactively.

See [Development Setup](./docs/src/content/docs/development-setup.md) for the full guide.

---

## Architecture Overview

```
┌────────────────────────────────────────────┐
│              Client (PWA)                  │
│  Rider Dashboard    │   Admin Dashboard    │
└────────┬────────────────────────┬──────────┘
         │ HTTP                   │ Supabase Realtime
         ▼                        ▼
┌────────────────────────────────────────────┐
│         Next.js 15 (App Router / Vercel)   │
│  /(auth)  /(dashboard)  /(admin)           │
│  /api/cron/*   /api/payments/*             │
│  ────────────────────────────────────────  │
│  lib/adjudicator   lib/fraud   lib/ml      │
│  lib/supabase      lib/utils               │
└────────────────┬───────────────────────────┘
                 │
    ┌────────────┼──────────────┐
    ▼            ▼              ▼
Supabase    External APIs   Supabase Cron / GitHub
PostgreSQL  Tomorrow.io     hourly adjudicator
Auth        Open-Meteo      weekly premium
Realtime    NewsData.io
            OpenRouter LLM
            Stripe
```

**How it works:**

1. **Rider onboards** → Step 1: platform (Zepto/Blinkit), name, phone, zone. Step 2: government ID (Aadhaar) + face liveness verification.
2. **Subscribes weekly** → pays ₹79–₹149/week via Stripe (3 tiers, dynamic pricing).
3. **Disruption triggers** → **Realtime:** providers that support push (e.g. Tomorrow.io Alerts) POST to `/api/webhooks/disruption`. **Every 15 min:** cron polls weather, AQI, and news APIs for the rest.
4. **Disruption detected** → 7-check fraud pipeline → `parametric_claims` inserted with `status='paid'`.
5. **Rider's wallet updates** in real time via Supabase Realtime — no claim form needed.

---

## Parametric Triggers

| Trigger              | Source                   | Threshold                            |
| -------------------- | ------------------------ | ------------------------------------ |
| Extreme heat         | Open-Meteo / Tomorrow.io | >43°C for 3+ hours                   |
| Heavy rain           | Tomorrow.io              | ≥ 4 mm/hr precipitation              |
| Severe AQI           | WAQI / Open-Meteo        | 40% above zone's 30-day p75 baseline |
| Zone curfew / strike | NewsData.io + LLM        | LLM severity ≥ 6/10                  |
| Traffic gridlock     | NewsData.io + LLM        | LLM severity ≥ 6/10                  |

---

## Tech Stack

| Layer      | Stack                                               |
| ---------- | --------------------------------------------------- |
| Frontend   | Next.js 15, TypeScript, Tailwind CSS, Framer Motion |
| Backend    | Supabase (PostgreSQL, Auth, Realtime)               |
| AI / LLM   | OpenRouter (`arcee-ai/trinity-large-preview:free`)  |
| Weather    | Tomorrow.io, Open-Meteo, WAQI                       |
| News       | NewsData.io                                         |
| Payments   | Stripe (test mode)                                  |
| Deployment | Vercel — Mumbai region (`bom1`)                     |
| PWA        | `@ducanh2912/next-pwa` with offline fallback        |

---

## Database Setup

Apply all migrations in `supabase/migrations/` (run in timestamp order) to your Supabase project:

**Option A — Supabase Dashboard:** SQL Editor → run each file in timestamp order.

**Option B — CLI:**

```bash
npx supabase link --project-ref <project-ref>
yarn db:migrate
```

---

## Cron Jobs

- **Adjudicator:** every **15 minutes** (covers weather/AQI/news that don’t support webhooks). For **realtime**, use `POST /api/webhooks/disruption` for providers that support push (see [Realtime Triggers](./docs/REALTIME-TRIGGERS.md)).
- **Weekly premium:** Sunday 17:30 UTC.

**Free option:** use the GitHub Actions workflow in `.github/workflows/cron.yml` — add `CRON_SECRET` and `APP_URL` as repo secrets. See [Deployment → Cron Jobs](docs/docs/deployment.md#cron-jobs) for setup.

---

## License

MIT
