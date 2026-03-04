# Oasis — AI-Powered Parametric Insurance for Q-Commerce Riders

> **Hackathon:** Guidewire DEVTrails · **Category:** InsurTech / Parametric Insurance
> **Stack:** Next.js 15 · Supabase (Postgres + Edge Functions) · Tomorrow.io · Open-Meteo · NewsData.io

---

## What is Oasis?

Oasis is a fully automated **parametric income-protection insurance platform** for India's Q-commerce gig delivery partners (Zepto, Blinkit, Swiggy Instamart). When extreme weather, air quality emergencies, or civic disruptions make delivery impossible, Oasis detects the disruption automatically and pays riders directly — **zero manual claims, zero paperwork**.

### Key Product Principles

| Principle | Detail |
|-----------|--------|
| **Parametric** | Payout triggered by objective external data, not rider-submitted claims |
| **Weekly pricing** | Riders subscribe week-by-week (₹79 – ₹149/week) |
| **Income-only** | Covers loss of income from disruptions only — no health, life, or vehicle coverage |
| **Instant payout** | Adjudicator runs every 6 hours; payouts processed automatically |
| **Fraud-resistant** | Multi-layer fraud detection including device fingerprinting and cluster anomaly detection |

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System design, data flows, and component diagrams |
| [Database](./DATABASE.md) | Full schema reference, indexes, RLS policies, and views |
| [API Reference](./API.md) | All REST endpoints with request/response shapes |
| [Adjudicator Engine](./ADJUDICATOR.md) | Core parametric trigger logic, adaptive AQI algorithm |
| [Deployment Guide](./DEPLOYMENT.md) | Environment setup, migration runbook, production checklist |

---

## Feature Overview

### Rider-Facing Features

- **Policy subscription** — Browse Basic / Standard / Premium plans; activate with weekly premium
- **Real-time wallet** — Live payout balance via Supabase Realtime subscriptions
- **Risk Radar** — Displays current disruption severity for the rider's zone
- **Claims history** — Full history of triggered payouts with disruption context
- **Location verification** — GPS-based proof of presence in affected zone at claim time
- **Delivery impact reports** — Riders can self-report inability to deliver, feeding platform status

### Admin Features

- **Live triggers dashboard** — Real-time view of active disruption events with AQI baseline breakdown
- **Fraud queue** — Review, approve, or reject flagged claims with full audit trail
- **Analytics charts** — Claims timeline, loss ratio, trigger-type breakdown (Recharts)
- **System health** — Last adjudicator run, API connectivity, 24h error counts
- **Demo mode** — Inject synthetic disruption events for testing/demo without real data

### Automation Features

- **Parametric adjudicator** — Runs via cron every 6 hours; auto-detects disruptions and creates payouts
- **Zone clustering** — Groups nearby rider zones to minimize external API calls
- **Adaptive AQI thresholds** — Per-zone baselines calculated from 30-day history (prevents chronic-pollution false triggers in cities like Delhi)
- **pg_cron scheduling** — Policy expiry and premium recomputation run autonomously at the DB level
- **Auto-profile creation** — Supabase trigger creates rider profile on signup

---

## Technology Stack

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│         Next.js 15 (App Router, TypeScript)          │
│         Tailwind CSS + Radix UI + Recharts           │
└─────────────────────┬───────────────────────────────┘
                      │ server actions / fetch
┌─────────────────────▼───────────────────────────────┐
│                   Backend                            │
│           Next.js API Routes (Node.js)               │
│      Supabase Edge Functions (Deno / TypeScript)     │
└──────┬──────────────┬──────────────┬────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌────▼────────────────┐
│  Supabase   │ │ Tomorrow  │ │  Open-Meteo          │
│  Postgres   │ │    .io    │ │  (weather + AQI)     │
│  + Realtime │ │ (weather) │ └─────────────────────┘
│  + Storage  │ └─────┬─────┘       │
└─────────────┘       │    ┌────────▼────────────────┐
                      │    │  NewsData.io + OpenRouter│
                      │    │  (news + LLM classifier) │
                      │    └─────────────────────────┘
                      │
              ┌───────▼──────────────┐
              │  Vercel (hosting)    │
              │  + Cron triggers     │
              └──────────────────────┘
```

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/lohitkolluri/oasis.git
cd oasis
npm install

# 2. Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys

# 3. Apply database migrations
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push

# 4. Run development server
npm run dev
```

See the [Deployment Guide](./DEPLOYMENT.md) for full production setup.

---

## Coverage Rules (Hackathon Constraints)

> These constraints are hard-coded into the product design and must never be violated.

- ✅ **Covers:** Loss of income due to extreme weather, severe air quality events, zone lockdowns/civic disruptions
- ❌ **Does NOT cover:** Health, life, accidents, vehicle damage/repairs
- ✅ **Pricing model:** Weekly only (7-day policy windows)
- ✅ **Claims:** 100% automated — no manual filing required
