<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:10b981,100:6366f1&height=140&section=header&text=Oasis&fontSize=64&fontColor=ffffff&fontAlignY=38&desc=Income%20protection%20for%20India's%20delivery%20partners&descSize=15&descAlignY=58&descAlign=50&animation=fadeIn" width="100%" alt="Oasis Header" />

<br />
<img src="./public/logo.png" alt="Oasis" width="110" />
<br />
<strong>AI-powered parametric wage protection.</strong><br />
Weekly billing. Automatic triggers. Zero claim forms.
<br /><br />
<a href="https://oasis-murex-omega.vercel.app">
  <img src="https://img.shields.io/badge/Live%20Demo-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
</a>
&nbsp;&nbsp;
<a href="https://oasisdocs.vercel.app">
  <img src="https://img.shields.io/badge/Documentation-6366f1?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Documentation" />
</a>
&nbsp;&nbsp;
<a href="./Pitch%20Deck.pdf">
  <img src="https://img.shields.io/badge/Pitch%20Deck-0ea5e9?style=for-the-badge&logo=microsoftpowerpoint&logoColor=white" alt="Pitch Deck" />
</a>
&nbsp;&nbsp;
<a href="https://github.com/lohitkolluri/Oasis/issues">
  <img src="https://img.shields.io/badge/Report%20Bug-ef4444?style=for-the-badge&logo=github&logoColor=white" alt="Report Bug" />
</a>
<br />
<img src="https://img.shields.io/badge/next.js_15-000?style=flat-square&logo=nextdotjs&logoColor=white" />
<img src="https://img.shields.io/badge/typescript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=000" />
<img src="https://img.shields.io/badge/tailwind_css-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/razorpay-02042B?style=flat-square&logo=razorpay&logoColor=white" />
<img src="https://img.shields.io/badge/pwa-5A0FC8?style=flat-square&logo=pwa&logoColor=white" />
<img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" />

</div>

## Oasis

Oasis is an **AI-powered parametric insurance** prototype for India’s gig delivery partners (Zepto, Blinkit, Instamart, etc.). It sells **weekly** income-protection plans and uses **automated triggers** (weather, curfews/lockdowns, major disruptions) to create eligible payout events without paperwork-heavy claims.

> [!IMPORTANT]
> **Product scope (strict):** Oasis covers **loss of income from external disruptions only** (e.g., extreme weather, zone curfew/lockdown, severe delivery-blocking disruption). It does **not** cover **health**, **life**, **accidents**, or **vehicle repairs**. **Billing is weekly only.**

### What’s inside

- **Rider app**: onboarding + KYC, weekly plan purchase, coverage status, claims, wallet, PWA support.
- **Admin console**: trigger/source health, operations, pricing analytics, demo trigger tools.
- **Parametric engine**: scheduled ingestion + rule evaluation + ledger events + fraud/location checks.
- **Integrations**: Supabase (Postgres/Auth/Realtime/Storage), Razorpay (weekly billing), OpenRouter (LLM/vision verification), Tomorrow.io / Open-Meteo / NewsData / TomTom (signals).

### Tech stack (high level)

Next.js 15 (App Router), React 18, TypeScript, Tailwind + shadcn/ui, Supabase, Razorpay, OpenRouter, MapLibre/Turf, Vitest, Playwright, Astro Starlight (docs).

### Repository structure

```text
app/            Next.js routes (rider, admin, API)
components/     UI components (rider/admin/shared)
lib/            Core logic (adjudicator, pricing, fraud, payments, geo, clients)
scripts/        Setup and helper scripts
supabase/       Migrations and Supabase tooling
tests/          Vitest + Playwright tests
docs/           Documentation site + OpenAPI
```

## Quickstart

**Prereqs:** Node.js 20+, Bun (or npm), a Supabase project, Razorpay **test** keys.

```bash
bun install
cp .env.local.example .env.local
# fill values in .env.local
bun run db:migrate
bun run setup-storage
bun dev
```

Open `http://localhost:3000`.

## Environment variables

Copy the template and fill required values:

```bash
cp .env.local.example .env.local
```

Key variables (see `.env.local.example` for the full list):

| Variable                        | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key                             |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role (server-only)           |
| `ADMIN_EMAILS`                  | Comma-separated admin emails                  |
| `OPENROUTER_API_KEY`            | LLM/vision verification                       |
| `TOMORROW_IO_API_KEY`           | Weather signals                               |
| `NEWSDATA_IO_API_KEY`           | News signals                                  |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`   | Razorpay key id (must be `rzp_test_*` in dev) |
| `RAZORPAY_KEY_SECRET`           | Razorpay secret (server-only)                 |

> [!CAUTION]
> Never commit `.env.local`. Never expose server-only keys to the browser (no `NEXT_PUBLIC_` prefix).

## Running tests

```bash
bun run test        # Vitest
bun run test:e2e    # Playwright
bun run lint
```

## Deployment

### Vercel (recommended)

- Import the repo into Vercel
- Set environment variables (same as `.env.local.example`)
- Deploy

### Background jobs (cron)

These endpoints are meant to run on a schedule (see `.github/workflows/cron.yml` for one option):

| Endpoint                             | Cadence   | Purpose                                                        |
| ------------------------------------ | --------- | -------------------------------------------------------------- |
| `/api/cron/adjudicator`              | ~15 min   | Ingest signals, detect disruptions, create ledger/claim events |
| `/api/cron/self-report-verification` | As needed | Drain queued self-reports and re-run vision verification       |
| `/api/cron/weekly-premium`           | Weekly    | Weekly billing + policy window rotation                        |

## API reference & docs

- **OpenAPI spec**: `docs/openapi.yaml`
- **Docs site**: `https://oasisdocs.vercel.app`

## License

MIT. See `LICENSE`.

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:10b981,100:6366f1&height=120&section=footer" width="100%" alt="" />

<div align="center">

<a href="https://oasis-murex-omega.vercel.app"><strong>Live Demo</strong></a> &nbsp;·&nbsp;
<a href="https://oasisdocs.vercel.app"><strong>Docs</strong></a> &nbsp;·&nbsp;
<a href="https://github.com/lohitkolluri/Oasis/issues"><strong>Issues</strong></a>

<br />

</div>
