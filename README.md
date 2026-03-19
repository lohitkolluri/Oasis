# Oasis

AI‑powered parametric wage protection for India's Q‑commerce delivery partners.

<p align="center">
  <a href="https://oasis-murex-omega.vercel.app"><img src="https://img.shields.io/badge/App-Live%20demo-10b981?style=for-the-badge&logo=vercel&logoColor=white" alt="Oasis live app" /></a>
  <a href="https://oasisdocs.vercel.app"><img src="https://img.shields.io/badge/Docs-Oasis%20Docs-6366f1?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Oasis docs" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Next.js%2015-000000?style=flat-square&logo=nextdotjs" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=111827" alt="Supabase" />
  <img src="https://img.shields.io/badge/Styling-Tailwind%20CSS-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Payments-Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white" alt="Stripe (temporary)" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" alt="MIT License" />
</p>

Oasis safeguards gig workers (Zepto, Blinkit, etc.) against **loss of income** caused by external disruptions (extreme weather, zone lockdowns, traffic gridlock) using **weekly premiums**, **parametric triggers**, and **automatic payouts** without manual claims forms.

> Coverage is strictly for **loss of income only**; there is no health, life, accident, or vehicle repair coverage.

---

## Table of Contents

- [Features](#features)
- [Parametric insurance (what we mean by it)](#parametric-insurance-what-we-mean-by-it)
- [Adversarial Defense & Anti-Spoofing Strategy](#adversarial-defense--anti-spoofing-strategy)
- [Industry patterns we borrow (provider examples)](#industry-patterns-we-borrow-provider-examples)
- [India regulatory context (high-level, product-agnostic)](#india-regulatory-context-high-level-product-agnostic)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [License](#license)
- [Sources](#sources)

---

## Features

- **Parametric wage protection** for Q‑commerce delivery partners driven by external disruption triggers.
- **Multi-source trigger engine** using weather, AQI, traffic, and news feeds (Tomorrow.io, Open‑Meteo, WAQI, NewsData.io).
- **Weekly premium model** with configurable plans (Basic, Standard, Premium) and automatic weekly coverage windows.
- **Adjudicator engine** that runs on cron and webhooks to auto-create and verify claims without manual adjustment.
- **Fraud and sanity checks** pipeline (caps, duplication checks, geo validation, device heuristics).
- **Rider PWA dashboard** for onboarding, KYC (government ID and face verification), policies, wallet, and claim history.
- **Admin console** for system health, riders, triggers, payouts, fraud monitoring, and financial analytics.
- **Supabase Auth with row-level security** for secure multi-role access (rider and admin).
- **Stripe integration** for weekly premium payments and payout tracking (temporary; Razorpay UPI planned once our Razorpay account is reinstated).
- **Realtime user experience** via Supabase Realtime for live wallet and claim updates.
- **Documentation site** built with Astro Starlight covering architecture, APIs, database schema, and deployment.

Live resources:

- **App**: [`https://oasis-murex-omega.vercel.app`](https://oasis-murex-omega.vercel.app)
- **Docs**: [`https://oasisdocs.vercel.app`](https://oasisdocs.vercel.app)

---

## Parametric insurance (what we mean by it)

In Oasis, **parametric** means payouts are driven by a **predefined trigger/index** (for example, weather intensity or a disruption classification) rather than manual loss adjustment, so payouts can be fast and rules-based ([IAIS/FSI insights on parametric insurance](https://www.iais.org/uploads/2024/12/FSI-IAIS-Insights-on-parametric-insurance.pdf); [Descartes Underwriting parametric guide](https://descartesunderwriting.com/insights/parametric-insurance-comprehensive-guidebook-brokers-and-risk-managers); [PwC basis risk paper](https://www.pwc.ch/en/publications/2024/Basis_risk_in_parametric_insurance_challenges_and_mitigation_strategies.pdf)).

Two practical design constraints we follow:

- **Basis risk is real**: if the index doesn’t track a rider’s actual income loss well, the experience breaks down (and disputes increase) ([PwC basis risk paper](https://www.pwc.ch/en/publications/2024/Basis_risk_in_parametric_insurance_challenges_and_mitigation_strategies.pdf); [Swiss Re parametric guide](https://corporatesolutions.swissre.com/dam/jcr:0cd24f12-ebfb-425a-ab42-0187c241bf4a/2023-01-corso-guide-of-parametric-insurance.pdf)).
- **Data integrity matters**: if trigger inputs are easy to spoof, the pool can be drained by coordinated abuse ([CISA PNT report on interference/spoofing](https://www.cisa.gov/sites/default/files/publications/report-on-pnt-backup-complementary-capabilities-to-gps_508.pdf)).

---

## Adversarial Defense & Anti-Spoofing Strategy

A realistic threat for any parametric payout system is **GPS spoofing** and coordinated abuse attempts. Our goal is to **separate genuinely impacted riders** from **spoofed actors** without punishing honest workers experiencing real network/device issues.

### 1) Differentiation (real stranded vs spoofed)

- **Multi-signal verification, not “GPS-only”**: location is treated as *one* weak signal. A payout requires a consistent story across multiple independent signals.
- **Physical plausibility checks**:
  - **Impossible travel**: jumps between far-apart zones within an unrealistic time window.
  - **Route plausibility**: if the rider claims to be inside a disruption zone but all nearest road routes / reachable areas contradict the claim, confidence drops.
  - **Geofence boundary behavior**: repeated “edge hugging” patterns (hovering exactly on the boundary) are characteristic of spoofing scripts.
- **Temporal alignment**:
  - **Event-time consistency**: a valid claim should show rider presence *during* the disruption window, not only immediately after it’s published.
  - **Session continuity**: abrupt “teleport” + no intermediate telemetry is suspicious.
- **Device integrity heuristics** (risk scoring, not hard blocks):
  - multiple accounts sharing the same device fingerprint patterns,
  - unusually high claim frequency relative to time active,
  - repeated claims always occurring immediately after triggers.

### 2) Data signals to detect a coordinated fraud ring

We look for *correlated anomalies* across riders (ring behavior) rather than penalizing single riders:

- **Cross-account clustering**:
  - shared **device fingerprints**, repeated network identifiers, repeated behavioral timing patterns,
  - many riders “appearing” in the same small geofence with near-identical coordinates at the same timestamps.
- **Burst detection**:
  - sudden spikes of claim triggers from a single neighborhood or across many accounts in minutes.
- **Signal disagreement**:
  - rider-claimed location vs weather/AQI severity at that coordinate,
  - rider-claimed location vs platform operational status / traffic reality for that area.
- **Account graph risk**:
  - new accounts that immediately claim high severity events,
  - high-risk subgraphs (many accounts created recently + same claim patterns).

### 3) UX balance (flagging without punishing honest riders)

- **Soft-fail, not deny-by-default**: “flagged” claims go into a **pending verification** state rather than rejection.
- **Progressive verification**:
  - **Step 1 (low friction)**: background checks + short GPS verification.
  - **Step 2 (medium friction, only if needed)**: rider provides a quick declaration + optional photo proof (e.g., local conditions).
  - **Step 3 (highest friction, rare)**: manual admin review only for extreme ring patterns (kept minimal; core system remains automated).
- **Fairness guardrails**:
  - don’t block payouts due to a single weak signal (e.g., temporary network drop),
  - use ring-level evidence (burst + clustering) before applying stricter verification,
  - transparently communicate: “verification needed due to unusual activity in your area” with a fast path to resolution.

This defense preserves the product constraints: **loss-of-income only**, **weekly pricing**, and **automated payouts** while remaining resilient under adversarial GPS spoofing.

---

## Industry patterns we borrow (provider examples)

These external examples show how mature parametric products reduce disputes and basis risk (Oasis does **not** implement these yet; we treat them as future patterns, not current features):

- **Hyper-local sensors for trigger accuracy** (example: FloodFlash) — property-installed IoT sensors measure flood depth directly at the insured location, cutting basis risk vs distant gauges ([FloodFlash on choosing IoT sensors](https://floodflash.co/made-to-measure-why-floodflash-chose-iot-sensors-to-power-our-parametric-cover/)).
- **Independent public datasets for transparent triggers** (example: Jumpstart) — earthquake payouts tied to USGS ShakeMap data rather than self-reported loss ([Jumpstart Insurance homepage](https://www.jumpstartinsurance.com/)).
- **Multi-source remote sensing + modeling** (example: Descartes Underwriting) — indices monitored from satellite/radar/IoT feeds with upfront trigger + payout design ([Descartes Underwriting parametric guide](https://descartesunderwriting.com/insights/parametric-insurance-comprehensive-guidebook-brokers-and-risk-managers)).

On the “anti-spoofing” side, GNSS ecosystems are moving toward **signal authentication** like Galileo’s Open Service Navigation Message Authentication (OSNMA), which is intended to cryptographically authenticate navigation messages and make spoofing harder ([Galileo OSNMA service page](https://www.gsc-europa.eu/galileo/services/galileo-open-service-navigation-message-authentication-osnma); [EUSPA OSNMA launch press release](https://www.euspa.europa.eu/pressroom/press-releases/galileo-be-first-gnss-offer-authentication-service-worldwide-launch-osnma)).

### How Oasis could evolve toward similar patterns (future work)

- **Dark-store / hub sensors**: install environmental sensors (temperature, humidity, rain ingress) inside partner dark stores or at hub entrances, feeding a local “operations disruption index” that complements city-level weather/AQI feeds.
- **Depot-level disruption beacons**: small IoT devices at key depots recording power cuts, network blackouts, or gate-closed events, used as an additional trigger for loss-of-income payouts during curfews or grid failures.
- **Provider-attested GNSS signals**: over time, integrate device/OS-level attestation (e.g., Play Integrity / similar) and, as ecosystem support matures, GNSS authentication services like OSNMA as one of the signals in the fraud scorecard.

---

## India regulatory context (high-level, product-agnostic)

Oasis is a hackathon prototype, not a live insurance product. But the design is informed by India’s innovation and distribution frameworks:

- **IRDAI Regulatory Sandbox**: the IRDAI (Regulatory Sandbox) Regulations, 2019 provide a controlled environment to test innovative products/business models in insurance ([IRDAI Regulatory Sandbox Regulations, 2019 PDF](https://financialservices.gov.in/beta/sites/default/files/2024-11/IRDAI%20%28Regulatory%20Sandbox%29%20Regulations%2C%202019.pdf); [IRDAI exposure draft referencing sandbox validity/extension context](https://irdai.gov.in/documents/37343/365848/Exposure+Draft-+Sandbox+Regulation+Amendment+2022.pdf/75613946-65f3-9e2a-cfc0-35d825d12507?version=1.2&t=1665290561061)).
- **Micro-insurance**: IRDAI’s Micro Insurance Regulations (2015) are a frequently-cited framework for simplified, low-premium products and distribution to underserved segments (including explicit caps like ₹2,00,000 for certain categories) ([IRDAI Micro Insurance Regulations, 2015 PDF](https://irdai.gov.in/document-detail?documentId=37343)).

Oasis stays intentionally narrow:

- **Coverage scope**: only loss-of-income due to external disruptions; explicitly excludes health, life, accident, and vehicle repair.
- **Pricing cadence**: weekly, not monthly/annual.
- **Claims**: automated, parametric, no manual loss adjustment forms.

---

## Tech Stack


| Layer         | Technologies                                                                    |
| ------------- | ------------------------------------------------------------------------------- |
| Framework     | Next.js 15 (App Router), React 18                                               |
| Language      | TypeScript                                                                      |
| Styling/UI    | Tailwind CSS, shadcn/ui (Radix primitives), Framer Motion, Lucide icons         |
| Backend API   | Next.js API routes (`/api/`*)                                                   |
| Data & Auth   | Supabase (PostgreSQL, Auth, Realtime, Storage)                                  |
| Payments      | Stripe (Razorpay UPI planned post account reinstatement)                        |
| External APIs | Tomorrow.io, Open‑Meteo, WAQI, NewsData.io, OpenRouter (LLM)                    |
| Realtime      | Supabase Realtime                                                               |
| PWA           | `@ducanh2912/next-pwa`                                                          |
| Docs          | Astro + Starlight (`Docs/` workspace, hosted at `https://oasisdocs.vercel.app`) |
| Tooling       | Node.js ≥ 20, ESLint, Tailwind, `tsx`                                           |


---

## Architecture

Oasis is a **Next.js 15 App Router** application backed by **Supabase** for data, auth, storage, and realtime updates, with background jobs and webhooks driving the parametric trigger engine.

- **Client layer**: Rider and admin dashboards implemented as a mobile-first PWA (Web). **Platform choice justification:** We intentionally chose a Web-based PWA over a native Mobile app to eliminate app-store friction, avoid forced manual updates, and preserve storage on the low-end smartphones typically used by delivery partners.
- **Application layer**: Next.js API routes handle onboarding, policies, claims, payments, and admin features.
- **Data and services layer**: Supabase PostgreSQL for core tables and row-level security, plus external providers for weather, AQI, traffic, news, payments, and LLM tasks.
- **Automation layer**: Cron endpoints and webhooks run the adjudicator and weekly premium jobs, creating parametric claims and updating wallets automatically.

### Architecture Overview

```mermaid
flowchart LR
  subgraph Client["Client (PWA)"]
    R["Rider Dashboard"]
    A["Admin Dashboard"]
  end

  Client -->|HTTP| App["App Server (Next.js)"]
  App -->|Supabase SDK| DB["Supabase"]
  App -->|Scheduled jobs| Cron["Scheduler"]
  App -->|Provider calls| APIs["External APIs"]

  DB <--> RT["Realtime"]

  APIs --- W["Weather & AQI"]
  APIs --- N["News & Restrictions"]
  APIs --- L["LLM checks"]
  APIs --- P["Payments"]

  subgraph Core["Core Logic"]
    Adj["Trigger Engine"]
    Fraud["Fraud & Sanity Checks"]
    ML["Pricing & Risk Models"]
  end

  App --> Adj
  App --> Fraud
  App --> ML
  Adj --> DB
  Fraud --> DB
  ML --> DB
```



**How it works:**

1. **Rider onboards** → platform (Zepto/Blinkit), identity, zone + KYC (government ID + face liveness).
2. **Subscribes weekly** → pays ₹49–₹199/week via Stripe (weekly tiers, dynamic pricing).
3. **Disruption triggers** → realtime push (webhooks) when available; otherwise cron polls weather/AQI/news on a 15‑minute cadence.
4. **Disruption detected** → fraud pipeline runs → `parametric_claims` inserted with `status='pending_verification'`.
5. **Payout release** → lightweight GPS verification (automatic when possible) → claim marked `paid` and wallet updates via realtime. No manual claims form required.

For full sequence diagrams and a detailed system breakdown, refer to the Architecture section in the docs site at `[https://oasisdocs.vercel.app](https://oasisdocs.vercel.app)`.

---

## Project Structure

High-level structure of the main app workspace:

```text
oasis/
├─ app/                        # Next.js App Router (routes, layouts, pages)
│  ├─ (auth)/                  # Public auth flows (login, register, onboarding)
│  ├─ (dashboard)/             # Rider dashboard (policies, claims, wallet, wallet history)
│  ├─ (admin)/                 # Admin console (analytics, riders, triggers, fraud, health)
│  ├─ api/                     # API routes (admin, rider, payments, cron, webhooks)
│  ├─ layout.tsx               # Root layout
│  └─ page.tsx                 # Landing / entry page
├─ components/                 # Shared UI and feature components
│  ├─ admin/                   # Admin dashboard components
│  ├─ rider/                   # Rider dashboard components
│  └─ ui/                      # Design system primitives (shadcn-based, Radix wrappers)
├─ hooks/                      # React hooks (for example, mobile layout helpers)
├─ lib/                        # Core business logic (adjudicator, fraud, ML, Supabase helpers)
├─ public/                     # Static assets (logos, PWA icons, background graphics)
├─ scripts/                    # Local tooling (env configuration, database reset)
├─ supabase/                   # Supabase migrations, types, and edge functions
├─ docs/                       # Astro Starlight documentation site (oasisdocs.vercel.app)
├─ .github/workflows/          # CI and scheduled cron workflows
├─ .cursor/                    # Cursor agent configuration and rules
├─ middleware.ts               # Next.js middleware (auth/session handling)
├─ next.config.ts              # Next.js configuration
└─ tailwind.config.ts          # Tailwind CSS configuration
```

See the documentation site (`https://oasisdocs.vercel.app`) for detailed database schema, API reference, and feature-level docs.

---

## Getting Started

### Prerequisites

- **Node.js** `>= 20`
- **Package manager**: `bun`
- **Supabase project** with:
  - PostgreSQL instance
  - Auth and Realtime enabled
- **Supabase CLI** (optional but recommended) for `db:migrate`
- **Stripe account & CLI** (for local webhook testing; Razorpay migration planned once account suspension is resolved)
- Access tokens / API keys for:
  - Tomorrow.io / Open‑Meteo / WAQI
  - NewsData.io
  - OpenRouter (LLM)

### Installation

Clone the repository and install dependencies using Bun:

```bash
# 1. Clone
git clone https://github.com/lohitkolluri/oasis.git
cd oasis

# 2. Install dependencies
bun install
```

Apply database migrations to your Supabase project (see the Development Setup section in the docs for full instructions):

```bash
# Run database migrations defined under supabase/migrations
bun run db:migrate
```

Set up Supabase storage buckets used by the app:

```bash
bun run setup-storage
```

### Environment Variables

Create a local env file:

```bash
cp .env.local.example .env.local
```

You can optionally run the interactive env configurator:

```bash
make configure
# or
npx tsx scripts/configure-env.ts
```

Core variables (see docs for the full list):


| Variable                             | Required   | Description                                                                                        |
| ------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | Yes        | Supabase project URL                                                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Yes        | Supabase anon key                                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`          | Yes        | Supabase service role key (server-side only)                                                       |
| `ADMIN_EMAILS`                       | Yes        | Comma-separated admin emails allowed into the admin console                                        |
| `TOMORROW_IO_API_KEY`                | Yes        | Weather API key for disruption detection                                                           |
| `NEWSDATA_IO_API_KEY`                | Yes        | News API key for traffic/lockdown triggers                                                         |
| `STRIPE_SECRET_KEY`                  | Yes        | Stripe secret key (test or live; temporary until Razorpay is re-enabled)                          |
| `STRIPE_WEBHOOK_SECRET`              | Yes        | Stripe webhook signing secret for payments callbacks                                               |
| `CRON_SECRET`                        | Yes (prod) | Shared secret for cron endpoints under `/api/cron/*`                                               |
| `WEBHOOK_SECRET`                     | If used    | Secret for `POST /api/webhooks/disruption` when using realtime push from providers                 |
| `NEXT_PUBLIC_APP_URL`                | Yes (prod) | Canonical app URL used for redirects and links (e.g. `https://your-app.vercel.app`)                |
| `OPENROUTER_API_KEY`                 | Yes        | LLM API key used for gov ID / face verification and news severity classification                   |
| `WAQI_API_KEY`                       | No         | Optional AQI data source                                                                           |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No         | Stripe publishable key for checkout (temporary while Razorpay is unavailable)                     |
| `GOV_ID_ENCRYPTION_KEY`              | Prod       | 32-byte base64 key for encrypting stored government ID images                                      |
| `FACE_PHOTO_ENCRYPTION_KEY`          | Prod       | 32-byte base64 key for encrypting face verification photos (falls back to `GOV_ID_ENCRYPTION_KEY`) |


> **Do not commit** `.env.local` or any secrets to version control.

Start the development server:

```bash
bun dev
```

The app runs by default at `http://localhost:3000`.

To run the documentation site locally:

```bash
cd Docs
bun install
bun dev
```

The docs site will be available at `http://localhost:4321` by default (Astro).

---

## Usage

Common workflows after setup:

- **Rider flow**
  - Visit the app, register via `(auth)` routes, and complete **KYC onboarding** (government ID + face verification).
  - Choose a **weekly plan** and complete payment via Stripe (Razorpay UPI checkout planned once account is reinstated).
  - Use the **dashboard** to view active coverage, disruption-based claims, and wallet payouts.
- **Admin flow**
  - Log in with an email included in `ADMIN_EMAILS` (or `role = 'admin'` in Supabase).
  - Use the **admin console** to:
    - Monitor riders, policies, and zone-level exposure.
    - Inspect **parametric triggers**, disruptions, and fraud signals.
    - Review system health, logs, and weekly revenue.
- **Background processing**
  - Configure cron (GitHub Actions, Supabase cron, or external scheduler) to call:
    - `/api/cron/adjudicator` every **15 minutes** for disruption detection and claims.
    - `/api/cron/weekly-premium` weekly for premium billing and coverage windows.
  - Optionally wire providers to `POST /api/webhooks/disruption` for **realtime push** instead of polling.

Refer to the docs (`Development Setup`, `Parametric Triggers`, `Claims Processing`, `Deployment`) for exact endpoints and payloads.

---

## Roadmap

This is an indicative roadmap; see issues and docs for up-to-date status.

- Rider onboarding with KYC (gov ID + face verification)
- Weekly premium plans with Stripe checkout (to be complemented with Razorpay UPI once available)
- Parametric trigger engine (weather, AQI, traffic, lockdowns)
- Automated claims creation and realtime wallet updates
- Admin console for riders, triggers, fraud, and financials
- Documentation site (architecture, APIs, database, deployment)
- Deeper ML-driven pricing and risk scoring per zone
- Expanded fraud scoring and anomaly detection
- Partner-facing embedding APIs and webhooks
- Multi-tenant support for multiple platforms/insurers
- Production hardening (observability, SLAs, scaling benchmarks)

---

## License

This project is licensed under the **MIT License**.
See the [LICENSE](./LICENSE) file for details.

---

## Sources

- [FSI-IAIS-Insights-on-parametric-insurance.pdf](https://www.iais.org/uploads/2024/12/FSI-IAIS-Insights-on-parametric-insurance.pdf) (Dec 2024)
- [A Comprehensive Guidebook for Brokers and Risk Managers](https://descartesunderwriting.com/insights/parametric-insurance-comprehensive-guidebook-brokers-and-risk-managers) (undated)
- [Basis risk in parametric insurance: challenges and mitigation strategies (PwC)](https://www.pwc.ch/en/publications/2024/Basis_risk_in_parametric_insurance_challenges_and_mitigation_strategies.pdf) (2024)
- [Comprehensive Guide to Parametric Insurance (Swiss Re Corporate Solutions)](https://corporatesolutions.swissre.com/dam/jcr:0cd24f12-ebfb-425a-ab42-0187c241bf4a/2023-01-corso-guide-of-parametric-insurance.pdf) (Jan 2023)
- [report-on-pnt-backup-complementary-capabilities-to-gps_508.pdf (CISA)](https://www.cisa.gov/sites/default/files/publications/report-on-pnt-backup-complementary-capabilities-to-gps_508.pdf) (Apr 2020)
- [Made to measure: why FloodFlash chose IoT sensors to power our parametric cover](https://floodflash.co/made-to-measure-why-floodflash-chose-iot-sensors-to-power-our-parametric-cover/) (undated)
- [Jumpstart Insurance](https://www.jumpstartinsurance.com/) (undated)
- [Service Navigation Message Authentication (OSNMA)](https://www.gsc-europa.eu/galileo/services/galileo-open-service-navigation-message-authentication-osnma) (Jul 2025)
- [Galileo to be the first GNSS to offer authentication service worldwide — launch of OSNMA](https://www.euspa.europa.eu/pressroom/press-releases/galileo-be-first-gnss-offer-authentication-service-worldwide-launch-osnma) (Jul 2025)
- [IRDAI (Regulatory Sandbox) Regulations, 2019 PDF](https://financialservices.gov.in/beta/sites/default/files/2024-11/IRDAI%20%28Regulatory%20Sandbox%29%20Regulations%2C%202019.pdf) (hosted copy)
- [Exposure Draft – Sandbox Regulation Amendment 2022 (IRDAI)](https://irdai.gov.in/documents/37343/365848/Exposure+Draft-+Sandbox+Regulation+Amendment+2022.pdf/75613946-65f3-9e2a-cfc0-35d825d12507?version=1.2&t=1665290561061) (Aug 2022)
- [IRDAI Micro Insurance Regulations, 2015](https://irdai.gov.in/document-detail?documentId=37343) (IRDAI portal)
