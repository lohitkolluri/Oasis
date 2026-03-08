
---
title: Deployment
description: Vercel deployment, cron setup
---

Deployed on **Vercel** in the Mumbai region (`bom1`) for low-latency serving. Next.js standalone output with PWA service worker.

---

## Vercel Deployment

### 1. Import the Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `.next` (auto-detected)

### 2. Set Environment Variables

In the Vercel project settings, add all variables from `.env.local.example`:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `ADMIN_EMAILS` | Yes | Comma-separated admin emails |
| `CRON_SECRET` | Yes | Random secret for cron job auth |
| `TOMORROW_IO_API_KEY` | Recommended | Weather trigger automation |
| `NEWSDATA_IO_API_KEY` | Recommended | News trigger automation |
| `OPENROUTER_API_KEY` | Recommended | LLM verification |
| `WAQI_API_KEY` | Optional | Ground-station AQI (fallback available) |
| `STRIPE_SECRET_KEY` | Production | Stripe API key for Checkout |
| `STRIPE_WEBHOOK_SECRET` | Production | Webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Yes (production) | Canonical app URL (e.g. `https://your-app.vercel.app`). Required for Stripe redirects and links |
| `WEBHOOK_SECRET` | If using webhook | For `POST /api/webhooks/disruption`; no fallback to CRON_SECRET |

:::danger Server-only keys
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, and `CRON_SECRET` must **never** be prefixed with `NEXT_PUBLIC_`. They are server-side only and Vercel will not expose them to the browser.
:::

### 3. Node version

The project pins Node in `package.json` under `engines.node` (e.g. `>=20`). Use the same major version in Vercel (Settings → General → Node.js Version) or ensure your build/runtime matches.

### 4. Region Configuration

`vercel.json` pins deployment to the Mumbai region:

```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["bom1"]
}
```

This co-locates the serverless functions with the Supabase project (use `ap-south-1` for best latency with Mumbai Supabase).

:::note Vercel Hobby and cron
Vercel Hobby plans allow only **daily** cron jobs. Hourly crons require Pro. Use GitHub Actions (Option A) or Supabase Cron (Option C) for free hourly triggers.
:::

:::tip Root Directory
**"No Next.js version detected"** - Set **Root Directory** to *empty* (or `.`) so Vercel uses the repo root where `package.json` includes Next.js. If Root Directory is `docs`, Vercel builds the Astro docs instead, which does not use Next.js.
:::

---

## Cron Jobs

Two scheduled jobs keep Oasis running: the adjudicator (hourly) and weekly premium renewal (Sunday). Choose one of the options below.

| Job | Schedule | IST | Purpose |
|---|---|---|---|
| `/api/cron/adjudicator` | Every 15 min | Every 15 min | Poll weather/news APIs, create disruption events and claims |
| `/api/cron/weekly-premium` | Sunday 17:30 UTC | Sunday 23:00 IST | Compute premium recommendations for next week |

### Option A: GitHub Actions (recommended for Hobby)

A workflow in `.github/workflows/cron.yml` runs both jobs on GitHub-hosted runners - works with Vercel Hobby.

**1. Add repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `CRON_SECRET` | Same value as in Vercel env (used to authenticate requests) |
| `APP_URL` | Your production URL, e.g. `https://your-app.vercel.app` |

**2. Enable workflow**

Push the workflow file to your default branch. GitHub will run it on schedule. No further setup needed.

**3. Manual runs**

Go to **Actions → Cron Jobs → Run workflow** and choose `adjudicator` or `weekly-premium` from the dropdown.

**4. Timeouts**

The route handlers use `maxDuration = 120` (adjudicator and weekly-premium). The workflow matches this so the client does not kill the request before the server completes:

- **Adjudicator:** `curl --max-time 120`
- **Weekly premium:** `curl --max-time 130` (slight buffer over 120s)

Do not reduce these values without also reducing the route `maxDuration` in the API, or long runs will show as failed in Actions while the server may still complete.

:::note Free tier
GitHub Actions provides 2,000 minutes/month free for private repos; public repos have higher limits. Hourly + weekly crons use well under 1,000 minutes/month.
:::

### Option B: Vercel Cron (Pro only)

Vercel **Pro** plans support hourly crons. Add the following to `vercel.json` if you upgrade:

```json
{
  "crons": [
    { "path": "/api/cron/adjudicator", "schedule": "0 * * * *" },
    { "path": "/api/cron/weekly-premium", "schedule": "30 17 * * 0" }
  ]
}
```

Vercel passes `Authorization: Bearer <CRON_SECRET>` automatically. If using both GitHub Actions and Vercel Cron, disable one to avoid duplicate runs.

### Option C: Supabase Cron (recommended)

Uses `pg_cron` inside your Supabase project. No external runners needed; cron jobs run in Postgres and call your Next.js API via `pg_net`.

**1. Migration**

Migration `20240311000000_supabase_cron_integration.sql` creates:
- `app_config` table for `cron_base_url` and `cron_secret`
- `call_adjudicator_cron()` and `call_weekly_premium_cron()` functions
- Hourly adjudicator + weekly premium jobs

**2. Configure**

In **Supabase Dashboard → SQL Editor**, run:

```sql
UPDATE app_config SET value = 'https://your-app.vercel.app' WHERE key = 'cron_base_url';
UPDATE app_config SET value = 'your-cron-secret-same-as-vercel' WHERE key = 'cron_secret';
```

Use the same `CRON_SECRET` as in Vercel env.

**3. Disable other crons**

If using Supabase Cron, disable GitHub Actions (remove/rename `.github/workflows/cron.yml`) or Vercel Cron (remove `crons` from `vercel.json`) to avoid duplicate runs.

:::tip Testing crons locally
```bash
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/adjudicator
```
:::

---

## Supabase Production Setup

1. **Create a production project** in the same region (`ap-south-1` / Mumbai).
2. **Run all migrations** in timestamp order (see [Development Setup → Database Setup](/development-setup#3-database-setup)).
3. **Enable Email Auth** in Supabase Dashboard → Auth → Providers.
4. **Set Site URL** to your Vercel domain: `https://your-app.vercel.app`
5. **Set Redirect URLs** to include: `https://your-app.vercel.app/auth/callback`
6. **Create storage buckets** (or run `yarn setup-storage`): `rider-reports`, `government-ids`, `face-photos` (all private).

---

## PWA Build

The PWA service worker is generated at build time by `@ducanh2912/next-pwa`. The following files are auto-generated (gitignored):

```
public/sw.js
public/workbox-*.js
public/fallback-*.js
```

In development (`NODE_ENV=development`), the service worker is **disabled** by default (configured in `next.config.ts`). It activates only in production builds.

---

## Build Output

`next.config.ts` sets `output: "standalone"`. This creates a self-contained Node.js server in `.next/standalone/` - useful for Docker deployments.

### Docker

A `Dockerfile` is included for containerized deployments (e.g., Dokploy, Fly.io):

```bash
docker build -t oasis .
docker run -p 3000:3000 --env-file .env.local oasis
```

---

## Post-Deployment Checklist (Production)

- [ ] **Secrets:** `CRON_SECRET`, `WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` set and not exposed to client
- [ ] **KYC (production):** `GOV_ID_ENCRYPTION_KEY` and `FACE_PHOTO_ENCRYPTION_KEY` (32-byte base64) set if storing gov ID / face photos
- [ ] **Database:** All migrations applied to the production Supabase database (run in timestamp order)
- [ ] **RLS:** Row Level Security enabled and tested for `profiles`, `weekly_policies`, `parametric_claims`, storage buckets
- [ ] **Storage buckets:** `rider-reports`, `government-ids`, `face-photos` created (private)
- [ ] **Supabase Auth:** Site URL and redirect URL set to production domain
- [ ] **Admin:** `ADMIN_EMAILS` includes at least one admin email
- [ ] **Cron:** `CRON_SECRET` set and matches the value used by GitHub Actions / Vercel Cron / Supabase Cron
- [ ] **Stripe webhook:** Endpoint `https://your-app.com/api/payments/webhook` added, subscribed to `checkout.session.completed`, signing secret in env
- [ ] **Cron schedule:** Adjudicator (hourly) and weekly-premium (Sunday) configured via one of: GitHub Actions, Vercel Cron (Pro), or Supabase Cron
- [ ] **Smoke tests:** Adjudicator run (Admin → Run Adjudicator), payment flow (subscribe in test mode), PWA install on Android Chrome
- [ ] **Health:** `GET /api/health` returns 200 when DB is reachable (use for load balancer health checks)

---

## Monitoring and Alerts

- **Admin → System Health** (`/admin/health`) — DB and optional Stripe reachability, last adjudicator run (with `run_id`, `duration_ms`, `error`, `payout_failures`, `log_failures`), external API status, recent `system_logs`.
- **Public health:** `GET /api/health` — returns 200 when Supabase is reachable, 503 otherwise (no auth). Use for Vercel or load balancer health checks.
- **`system_logs` table** — One row per adjudicator run: `event_type: 'adjudicator_run'` or `'adjudicator_demo'`, `metadata` includes `run_id`, `duration_ms`, `error`, `payout_failures`, `log_failures`.

### Suggested alert rules

Configure in your monitoring system (e.g. Supabase Dashboard → Logs, Vercel Analytics, or Datadog):

1. **Adjudicator run failure:** Alert when `system_logs` has a row with `event_type = 'adjudicator_run'` and `metadata->>'error' IS NOT NULL` (or `severity = 'error'`).
2. **Adjudicator slowness:** Alert when `metadata->>'duration_ms'` &gt; threshold (e.g. 300000 for 5 minutes).
3. **Health endpoint down:** Alert when `GET /api/health` returns 503 or times out (indicates DB unreachable).
4. **Error spike:** Alert when count of `system_logs` rows with `severity = 'error'` in the last 1h exceeds a threshold.

---

## Rollback

1. **Revert deployment:** In Vercel, use the previous deployment from the Deployments list and “Promote to Production”.
2. **Migrations:** Supabase migrations are forward-only. If a migration must be undone, add a new migration that reverses the schema change; do not edit existing migration files.
3. **Env vars:** Restore previous values in Vercel → Settings → Environment Variables if a bad value was pushed.
