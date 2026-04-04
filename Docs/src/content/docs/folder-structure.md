---
title: Folder Structure
description: Layered architecture - presentation, application, infrastructure
---

Layered architecture: presentation (pages + components), application (API routes + lib), infrastructure (Supabase migrations + Deno functions).

```
oasis/
├── app/                        # Next.js 15 App Router
│   ├── (auth)/                 # Route group: login, register, onboarding
│   ├── (dashboard)/            # Route group: rider-facing dashboard
│   ├── (admin)/                # Route group: admin console (ops, financial, health)
│   ├── api/                    # REST API handlers
│   │   ├── admin/              # Admin-only endpoints
│   │   ├── auth/               # Supabase signout
│   │   ├── claims/             # Location verification
│   │   ├── cron/               # Vercel cron jobs (adjudicator, weekly-premium, …)
│   │   ├── geo/                # Geocoding / turf helpers
│   │   ├── health/             # Uptime heartbeat
│   │   ├── onboarding/         # KYC + face verification
│   │   ├── payments/           # Razorpay checkout, verify, webhook, subscriptions
│   │   ├── platform/           # Platform status
│   │   ├── rider/              # Rider insight + delivery reports
│   │   ├── routing/            # OSRM proxy
│   │   └── webhooks/           # Inbound provider webhooks (e.g. disruption)
│   ├── globals.css
│   ├── layout.tsx              # Root layout (fonts, Toaster)
│   ├── manifest.ts             # PWA manifest
│   └── page.tsx                # Landing / redirect
│
├── components/                 # React UI components
│   ├── admin/                  # Admin dashboard widgets
│   ├── auth/                   # Auth page backgrounds
│   ├── landing/                # Marketing / landing sections
│   ├── pwa/                    # Install prompt, add-to-home
│   ├── rider/                  # Rider dashboard cards
│   └── ui/                     # Shared design system primitives
│
├── hooks/                      # Shared React hooks (e.g. use-mobile)
├── design-system/              # Design tokens / MASTER reference (oasis)
├── lib/                        # Business logic (no React)
│   ├── adjudicator/            # Parametric engine: run.ts, core, zones, triggers, …
│   ├── fraud/
│   │   └── detector.ts         # Multi-check fraud detection
│   ├── ml/
│   │   ├── next-week-risk.ts   # Predictive claims forecast
│   │   └── premium-calc.ts     # Dynamic weekly premium (₹49–₹199)
│   ├── payments/               # Razorpay helpers, crypto verification
│   ├── routing/
│   │   └── osrm.ts             # OSRM routing client
│   ├── supabase/
│   │   ├── admin.ts            # Service-role Supabase client
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── middleware.ts       # Session refresh helper
│   │   └── server.ts           # Server-side Supabase client
│   ├── types/
│   │   ├── css.d.ts            # CSS module ambient declaration
│   │   └── database.ts         # Shared TypeScript interfaces
│   └── utils/
│       ├── auth.ts             # isAdmin() + getAdminEmails()
│       └── geo.ts              # Turf.js geospatial utilities
│
├── supabase/
│   ├── functions/
│   │   └── enterprise-adjudicator/   # Deno Edge Function (optional path)
│   └── migrations/             # SQL migrations (timestamp order)
│
├── docs/                       # Starlight docs site (+ openapi.yaml)
│
├── scripts/
│   ├── configure-env.ts        # Interactive .env.local (also: make configure)
│   ├── setup-storage.ts        # Supabase storage bucket setup
│   └── seed-demo-data.sql      # Idempotent demo seed
│
├── e2e/                        # Playwright specs
├── public/                     # Static assets (PWA icons, logo)
├── middleware.ts               # Next.js edge middleware (session refresh)
├── Makefile                    # setup, dev, docs, test, db-migrate, …
├── next.config.ts              # Next.js config (PWA, standalone output)
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── (Vercel config via dashboard)  # Region + scheduled jobs configured in Vercel UI
```

---

## Directory Details

### `app/`

Next.js App Router. Route groups (parentheses) create layout boundaries without affecting the URL.

| Route group | URL prefix | Access |
|---|---|---|
| `(auth)` | `/login`, `/register`, `/onboarding`, `/auth/callback` | Public |
| `(dashboard)` | `/dashboard/*` | Authenticated rider |
| `(admin)` | `/admin/*` | Admin only |

#### `app/api/`

All REST endpoints. Each subdirectory maps to an API concern:

| Directory | Endpoint prefix | Purpose |
|---|---|---|
| `admin/` | `/api/admin/` | Admin actions (run adjudicator, review claims, analytics) |
| `auth/` | `/api/auth/` | Supabase sign-out |
| `claims/` | `/api/claims/` | GPS location verification |
| `cron/` | `/api/cron/` | Vercel cron handlers (adjudicator, weekly premium renewal) |
| `geo/` | `/api/geo/` | Geocoding and turf.js polygon calculations |
| `health/` | `/api/health/` | Basic uptime and system heartbeat checks |
| `onboarding/` | `/api/onboarding/` | ID verification and liveness checks for new riders |
| `payments/` | `/api/payments/` | Razorpay order, verify, `payment.captured` webhook |
| `platform/` | `/api/platform/` | Live platform operational status |
| `rider/` | `/api/rider/` | Rider AI insight, delivery impact reports |
| `routing/` | `/api/routing/` | OSRM route calculation proxy |
| `webhooks/` | `/api/webhooks/` | Inbound provider webhooks (e.g. disruption push) |

---

### `lib/`

Business logic and shared server utilities. **`lib/` does not import React.** Some files use Next.js server primitives (`next/headers`, `next/server`) for cookies, `NextResponse`, and Supabase SSR helpers.

| Module | Responsibility |
|---|---|
| `adjudicator/` | Parametric engine core (split across `core.ts`, `claims.ts`, `events.ts`, etc.) |
| `fraud/detector.ts` | Eleven independent fraud check functions + `runAllFraudChecks()` orchestrator |
| `ml/premium-calc.ts` | Stateless premium formula + DB helpers for historical event count |
| `ml/next-week-risk.ts` | Forecast-based or historical claims prediction for admin dashboard |
| `supabase/*.ts` | Context-appropriate Supabase client factories |
| `clients/` | Third-party SDK wrappers (Razorpay, OpenRouter, external weather) |
| `config/` | Environment abstractions and dynamic configs |
| `data/` | Reusable data fetching singletons and caching layers |
| `validations/` | Zod schema enforcement across the `lib/` boundary |
| `utils/auth.ts` | `isAdmin()` - checks email list or profile role |
| `utils/geo.ts` | `isWithinCircle()`, `distanceKm()`, `buildCirclePolygon()`, `reverseGeocode()` |
| `types/database.ts` | TypeScript interfaces for all DB tables |

---

### `components/`

| Directory | Contents |
|---|---|
| `ui/` | Design system atoms: `Button`, `Card`, `GlassCard`, `MetricCard`, `StatusBadge`, `DataTable`, `ZoneMap`, `ZoneMapLazy`, `GoeyToaster` |
| `rider/` | Domain components: `DashboardContent`, `PolicyCard`, `WalletBalanceCard`, `RealtimeWallet`, `RiskRadar` |
| `admin/` | Admin-specific: `AnalyticsCharts`, `FraudList`, `TriggersList`, `DemoTriggerPanel`, `SystemHealth` |
| `auth/` | `AuthBackground` - animated gradient for auth pages |
| `landing/` | Landing page structural elements, hero blocks, feature showcases |
| `pwa/` | `InstallPrompt`, `AddToHomeScreen` - PWA install UI |

---

### `supabase/migrations/`

Apply migrations in timestamp order. Each file name contains a timestamp prefix.
