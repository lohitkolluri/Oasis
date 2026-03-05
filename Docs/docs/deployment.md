---
id: deployment
title: Deployment
sidebar_position: 9
---

# Deployment

Oasis is deployed to **Vercel** in the Mumbai region (`bom1`) for low-latency serving to Indian users. The production build is a Next.js standalone output with PWA service worker generation.

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

:::danger Server-only keys
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, and `CRON_SECRET` must **never** be prefixed with `NEXT_PUBLIC_`. They are server-side only and Vercel will not expose them to the browser.
:::

### 3. Region Configuration

`vercel.json` pins deployment to the Mumbai region:

```json
{
  "regions": ["bom1"]
}
```

This co-locates the serverless functions with the Supabase project (which should also be in the `ap-south-1` region for best latency).

---

## Cron Jobs

Two scheduled jobs keep Oasis running: the adjudicator (hourly) and weekly premium renewal (Sunday). Choose one of the options below.

| Job | Schedule | IST | Purpose |
|---|---|---|---|
| `/api/cron/adjudicator` | Every hour | Every hour | Poll weather/news APIs, create disruption events and claims |
| `/api/cron/weekly-premium` | Sunday 17:30 UTC | Sunday 23:00 IST | Deactivate expired policies, renew for next week |

### Option A: GitHub Actions (free)

A workflow in `.github/workflows/cron.yml` runs both jobs on GitHub-hosted runners — no paid plan required.

**1. Add repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `CRON_SECRET` | Same value as in Vercel env (used to authenticate requests) |
| `APP_URL` | Your production URL, e.g. `https://your-app.vercel.app` |

**2. Enable workflow**

Push the workflow file to your default branch. GitHub will run it on schedule. No further setup needed.

**3. Manual runs**

Go to **Actions → Cron Jobs → Run workflow** and choose `adjudicator` or `weekly-premium` from the dropdown.

:::info Free tier
GitHub Actions provides 2,000 minutes/month free for private repos; public repos have higher limits. Hourly + weekly crons use well under 1,000 minutes/month.
:::

### Option B: Vercel Cron (paid)

If you're on Vercel Pro, `vercel.json` is already configured:

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

`next.config.ts` sets `output: "standalone"`. This creates a self-contained Node.js server in `.next/standalone/` — useful for Docker deployments.

### Docker

A `Dockerfile` is included for containerized deployments (e.g., Dokploy, Fly.io):

```bash
docker build -t oasis .
docker run -p 3000:3000 --env-file .env.local oasis
```

---

## Post-Deployment Checklist

- [ ] All migrations applied to the production Supabase database
- [ ] Storage buckets created: `rider-reports`, `government-ids`, `face-photos`
- [ ] Supabase Auth site URL + redirect URL set to production domain
- [ ] `ADMIN_EMAILS` includes at least one admin email
- [ ] `CRON_SECRET` is set and matches in Vercel env
- [ ] Stripe webhook: Add endpoint `https://your-app.com/api/payments/webhook`, subscribe to `checkout.session.completed`
- [ ] Cron jobs configured: GitHub Actions, Vercel Cron (Pro), or Supabase Cron
- [ ] Test the adjudicator manually: Admin Dashboard → Run Adjudicator
- [ ] Test payment flow: subscribe to a plan in test mode
- [ ] Verify PWA install works on Android Chrome

---

## Monitoring

- **Admin → System Health** (`/admin/health`) — shows database connectivity, API key status, and the last adjudicator run result.
- **Admin → Triggers** (`/admin/triggers`) — lists recent `live_disruption_events` with raw API data.
- **`system_logs` table** — append-only audit log of every adjudicator run.
