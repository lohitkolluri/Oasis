## Operations and Runbooks

This guide explains **how to run migrations, keep the database in sync, and operate Oasis safely** in each environment.

### 1. Prerequisites

- **Supabase CLI** installed (v2.x).
- Access to the target Supabase project (or local dev instance).
- `node` and `npm` installed.

Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd Oasis
npm install
```

Create your environment file:

```bash
cp .env.local.example .env.local
# Fill in all required Supabase, Open-Meteo, Tomorrow.io, NewsData, OpenRouter, and Razorpay keys.
```

### 2. Linking Supabase and Running Migrations

The project uses **SQL migrations** under `supabase/migrations/*.sql`. The npm script wraps `supabase db push`.

#### 2.1 Link a Supabase project (once per environment)

If you see an error like **"Cannot find project ref. Have you run supabase link?"**, link the project:

```bash
supabase link --project-ref <your-project-ref>
```

You can find the project ref in the Supabase dashboard URL or project settings.

#### 2.2 Apply migrations

Once linked:

```bash
npm run db:migrate
```

This will:

- Ensure all tables, views, indexes, triggers, and functions from:
  - `20240304000001_create_profiles.sql`
  - `20240304000002_create_weekly_policies.sql`
  - `20240304000003_create_live_disruption_events.sql`
  - `20240304000004_create_parametric_claims.sql`
  - `20240304000005_add_fraud_flags.sql`
  - `20240304000006_add_zone_coords.sql`
  - `20240304000007_premium_recommendations.sql`
  - `20240304000008_rider_delivery_reports.sql`
  - `20240304000009_claim_verifications.sql`
  - `20240304100000_plan_packages.sql`
  - `20240305000000_autonomous_db_improvements.sql`
  - `20240306000000_system_logs_and_fraud_enhancements.sql`
  - `20240306000001_aqi_baseline_tracking.sql`
- Are applied to the linked database in the correct order.

> **Note**: This agent validated the migrations for internal consistency and a successful Next.js build, but the actual `db:migrate` run depends on your `supabase link` configuration and project permissions.

### 3. Local Development

Start the dev server:

```bash
npm run dev
```

Key routes:

- Rider dashboard: `/dashboard`
- Rider policy views: `/dashboard/policy`, `/dashboard/policy/docs`
- Admin console: `/admin`, `/admin/analytics`, `/admin/fraud`, `/admin/health`, `/admin/triggers`

### 4. Automated Jobs and Cron

The **`20240305000000_autonomous_db_improvements.sql`** migration configures autonomous behaviour via pg_cron and pg_net.

#### 4.1 Configure application settings

Run once per environment (e.g. in Supabase SQL editor):

```sql
SELECT set_app_settings(
  'https://your-oasis-app.vercel.app', -- base_url
  'your-cron-secret-here'              -- cron_secret (also set in Vercel + Supabase env)
);
```

Ensure the same `CRON_SECRET` value is present in:

- Vercel (or hosting) environment variables for `/api/cron/weekly-premium`.
- Supabase project settings (if referenced there).

#### 4.2 Cron jobs (pg_cron)

After migrations:

- **Nightly policy expiry**
  - Job name: `oasis_expire_policies`
  - Schedule: `30 19 * * *` (19:30 UTC ≈ 01:00 IST)
  - Task: `SELECT expire_stale_policies();`

- **Weekly premium recomputation**
  - Job name: `oasis_weekly_premium_cron`
  - Schedule: `30 17 * * 0` (Sunday 17:30 UTC ≈ 23:00 IST)
  - Task: `net.http_post` to `/api/cron/weekly-premium` with `Authorization: Bearer <CRON_SECRET>`.

You can verify jobs via:

```sql
SELECT jobid, jobname, schedule, command
FROM cron.job
ORDER BY jobname;
```

### 5. Edge Function: Enterprise Adjudicator

The Supabase Edge Function mirrors `lib/adjudicator/run.ts` and is defined in:

- `supabase/functions/enterprise-adjudicator/index.ts`

Deployment (from the repo root):

```bash
cd supabase/functions/enterprise-adjudicator
supabase functions deploy enterprise-adjudicator --project-ref <your-project-ref>
```

Required environment variables (set in Supabase project settings / Vault):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `TOMORROW_IO_API_KEY`, `NEWSDATA_IO_API_KEY`
- `OPENROUTER_API_KEY`

### 6. Health Checks and Monitoring

- **System health API**: `/api/admin/system-health`
  - Uses `system_logs`, recent cron activity, and API-level checks to report platform health.
- **Admin analytics**: `/admin/analytics`
  - Reads from `parametric_claims`, `live_disruption_events`, `premium_recommendations`, and views like `fraud_cluster_signals`.

### 7. Verification and Quality Gates

Before deploying to production, the recommended checklist is:

```bash
# Type and build check (already passing)
npm run build

# Optional: once you have tests
npm run test:run
```

- The current repo has **no test files yet**, so `npm run test:run` exits with code 1 due to “No test files found”.
- The first `npm run lint` invocation in a new environment may prompt for ESLint setup interactively. Configure ESLint once (e.g. choose **Strict**) and commit the generated config so `npm run lint` can run non-interactively in CI.

