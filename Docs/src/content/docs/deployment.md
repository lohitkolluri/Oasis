
---
title: Deployment
description: Vercel deployment, cron setup
---

Oasis is deployed on **Vercel** in the Mumbai region (`bom1`) for low-latency serving, using a Next.js standalone build and a PWA service worker.

---

## Vercel Deployment

### 1. Import the Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `.next` (auto-detected)

### 2. Set Environment Variables (copy from `.env.local.example`)

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
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes (production) | Razorpay Key ID (`rzp_live_...` in live mode) |
| `RAZORPAY_KEY_SECRET` | Yes (production) | Razorpay Key Secret (server-only) |
| `RAZORPAY_WEBHOOK_SECRET` | Recommended | Signing secret for `POST /api/payments/webhook` (Razorpay Dashboard → Webhooks) |
| `NEXT_PUBLIC_APP_URL` | Yes (production) | Canonical app URL (e.g. `https://your-app.vercel.app`) for redirects and absolute links |
| `WEBHOOK_SECRET` | If using webhook | For `POST /api/webhooks/disruption`; no fallback to CRON_SECRET |

:::danger Server-only keys
`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, and `CRON_SECRET` must **never** be prefixed with `NEXT_PUBLIC_`. They are server-side only and Vercel will not expose them to the browser.
:::

### 3. Node version & region

- **Node:** project pins Node in `package.json` (`engines.node`). Match this in Vercel (Settings → General → Node.js Version).
- **Region:** set Vercel region close to your Supabase project (Mumbai / `ap-south-1`) for lower latency.

:::note Vercel Hobby and cron
Vercel Hobby plans allow only **daily** cron jobs. Hourly crons require Pro. Use GitHub Actions (Option A) or Supabase Cron (Option C) for free hourly triggers.
:::

:::tip Root Directory
**"No Next.js version detected"** - Set **Root Directory** to *empty* (or `.`) so Vercel uses the repo root where `package.json` includes Next.js. If Root Directory is `docs`, Vercel builds the Astro docs instead, which does not use Next.js.
:::

---

## Cron Jobs (adjudicator + weekly premiums)

Two scheduled jobs keep Oasis running: the **adjudicator** (every 15 minutes) and **weekly premium** renewal. Pick **one** scheduling option below.

| Job | Schedule | IST | Purpose |
|---|---|---|---|
| `/api/cron/adjudicator` | Every 15 min | Every 15 min | Poll weather/news APIs, create disruption events and claims |
| `/api/cron/weekly-premium` | Sunday 17:30 UTC | Sunday 23:00 IST | Compute premium recommendations for next week |

### Option A: GitHub Actions (simple, works on Hobby)

`.github/workflows/cron.yml` runs both jobs from GitHub.

**1) Add repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `CRON_SECRET` | Same value as in Vercel env (used to authenticate requests) |
| `APP_URL` | Your production URL, e.g. `https://your-app.vercel.app` |

**2) Enable workflow**

Push the workflow file to your default branch; GitHub will run it on schedule.

**3) Manual runs (optional)**

Go to **Actions → Cron Jobs → Run workflow** and choose `adjudicator` or `weekly-premium` from the dropdown.

**4) Timeouts**

The route handlers use `maxDuration = 120` seconds. The workflow matches this so the request isn’t killed early:

- **Adjudicator:** `curl --max-time 120`
- **Weekly premium:** `curl --max-time 130` (slight buffer over 120s)

Do not reduce these values without also reducing the route `maxDuration` in the API, or long runs will show as failed in Actions while the server may still complete.

:::note Free tier
GitHub Actions provides 2,000 minutes/month free for private repos; public repos have higher limits. Hourly + weekly crons use well under 1,000 minutes/month.
:::

### Option B: Vercel Cron (Pro)

On **Vercel Pro**, you can configure scheduled jobs in the Vercel dashboard to call the two paths above. Send `Authorization: Bearer <CRON_SECRET>` with each request.

### Option C: Supabase Cron

Use `pg_cron` inside Supabase so the database calls your Next.js API directly.

- Apply the **Supabase cron migration** (see `supabase/migrations/`).
- In **Supabase → SQL**, set:
  - `cron_base_url` to your app URL (`https://your-app.vercel.app`)
  - `cron_secret` to the same `CRON_SECRET` used in Vercel
- Disable any other cron option so each job runs **once**.

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

`@ducanh2912/next-pwa` generates the service worker at build time (files in `public/` are gitignored).  
In development, the service worker is **disabled**; it only activates in production builds.

---

## Build Output

`next.config.ts` sets `output: "standalone"`, producing a self-contained Node.js server in `.next/standalone/` (useful for Docker).

### Docker

A `Dockerfile` is included for Dokploy, Fly.io, or any container runtime.

---

## Post-Deployment Checklist (Production)

- [ ] **Secrets:** `CRON_SECRET`, `WEBHOOK_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET` set and not exposed to client
- [ ] **KYC (production):** `GOV_ID_ENCRYPTION_KEY` and `FACE_PHOTO_ENCRYPTION_KEY` (32-byte base64) set if storing gov ID / face photos
- [ ] **Database:** All migrations applied to the production Supabase database (run in timestamp order)
- [ ] **RLS:** Row Level Security enabled and tested for `profiles`, `weekly_policies`, `parametric_claims`, storage buckets
- [ ] **Storage buckets:** `rider-reports`, `government-ids`, `face-photos` created (private)
- [ ] **Supabase Auth:** Site URL and redirect URL set to production domain
- [ ] **Admin:** `ADMIN_EMAILS` includes at least one admin email
- [ ] **Cron:** `CRON_SECRET` set and matches the value used by GitHub Actions / Vercel Cron / Supabase Cron
- [ ] **Razorpay webhook:** Endpoint `https://your-app.com/api/payments/webhook` added, subscribed to `payment.captured`, signing secret in `RAZORPAY_WEBHOOK_SECRET`
- [ ] **Cron schedule:** Adjudicator (hourly) and weekly-premium (Sunday) configured via one of: GitHub Actions, Vercel Cron (Pro), or Supabase Cron
- [ ] **Smoke tests:** Adjudicator run (Admin → Run Adjudicator), payment flow (Razorpay test mode — see [Demo payments](/demo-payments/)), PWA install on Android Chrome
- [ ] **Health:** `GET /api/health` returns 200 when DB is reachable (use for load balancer health checks)

---

## Monitoring and Alerts

- **Admin → System Health** (`/admin/health`): shows DB/API reachability, last adjudicator run, and recent `system_logs`.
- **Public health:** `GET /api/health` returns 200 when Supabase is reachable, 503 otherwise (use for uptime checks).
- **`system_logs` table:** one row per adjudicator run with metadata (`run_id`, `duration_ms`, `error`, etc.).

Suggested alerts (in whatever monitoring you use):

- Adjudicator run **fails** or takes longer than a few minutes
- `GET /api/health` starts returning 503 / timing out

---

## Rollback

1. **Revert deployment:** In Vercel, use the previous deployment from the Deployments list and “Promote to Production”.
2. **Migrations:** Supabase migrations are forward-only. If a migration must be undone, add a new migration that reverses the schema change; do not edit existing migration files.
3. **Env vars:** Restore previous values in Vercel → Settings → Environment Variables if a bad value was pushed.
