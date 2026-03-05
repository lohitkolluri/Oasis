# Oasis

**AI-powered parametric wage protection for India's Q-commerce delivery partners.**

Oasis safeguards gig workers (Zepto, Blinkit) against income loss caused by external disruptions — extreme weather, zone lockdowns, and traffic gridlock — through automated, zero-touch payouts and weekly pricing aligned to their earnings cycle.

> Coverage is strictly for **loss of income only** — no health, life, accident, or vehicle repair coverage.

---

## Documentation

Full developer documentation is in the [`/docs`](./docs) folder (Docusaurus).

| Section                                                                | Description                             |
| ---------------------------------------------------------------------- | --------------------------------------- |
| [Architecture](./docs/docs/architecture.md)                            | System design, data flow, key modules   |
| [Development Setup](./docs/docs/development-setup.md)                  | Local setup, env vars, DB migrations    |
| [Parametric Triggers](./docs/docs/features/parametric-triggers.md)     | How the adjudicator works               |
| [Fraud Detection](./docs/docs/features/fraud-detection.md)             | 7-layer fraud check pipeline            |
| [Claims Processing](./docs/docs/features/claims-processing.md)         | End-to-end parametric claims            |
| [Database Schema](./docs/docs/database.md)                             | All tables, RLS, relationships          |
| [API Reference](./docs/docs/api.md)                                    | Every endpoint, request/response shapes |
| [Deployment](./docs/docs/deployment.md)                                | Vercel deployment, cron setup           |
| [Supabase Integrations](./docs/docs/features/supabase-integrations.md) | Cron, Queues, Stripe options            |

To run the docs site locally:

```bash
cd docs && npm install && npm start
```

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/lohitkolluri/oasis.git
cd oasis && yarn install

# 2. Set up environment variables
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS

# 3. Apply database migrations (Supabase Dashboard → SQL Editor, run in order)
#    or via CLI: npx supabase link && yarn db:migrate

# 4. Create storage bucket
yarn setup-storage

# 5. Run
yarn dev
```

**For local dev**, add `STRIPE_SECRET_KEY=sk_test_...` to `.env.local` to use Stripe Checkout with test cards.

See [Development Setup](./docs/docs/development-setup.md) for the full guide.

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

1. **Rider onboards** → selects platform (Zepto/Blinkit), pins their delivery zone on a map.
2. **Subscribes weekly** → pays ₹79–₹149/week via Stripe (3 tiers, dynamic pricing).
3. **Adjudicator runs every hour** → polls weather, AQI, and news APIs across all active rider zones.
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

Apply all 16 migrations in the `supabase/migrations/` folder to your Supabase project:

**Option A — Supabase Dashboard:** SQL Editor → run each file in timestamp order.

**Option B — CLI:**

```bash
npx supabase link --project-ref <project-ref>
yarn db:migrate
```

---

## Cron Jobs

Two scheduled jobs: adjudicator (hourly) and weekly premium (Sunday). **Free option:** use the GitHub Actions workflow in `.github/workflows/cron.yml` — add `CRON_SECRET` and `APP_URL` as repo secrets. See [Deployment → Cron Jobs](docs/docs/deployment.md#cron-jobs) for setup.

---

## License

MIT
