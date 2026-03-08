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
│   ├── (admin)/                # Route group: admin portal
│   ├── api/                    # REST API handlers
│   │   ├── admin/              # Admin-only endpoints
│   │   ├── auth/               # Supabase signout
│   │   ├── claims/             # Location verification
│   │   ├── cron/               # Vercel cron jobs
│   │   ├── payments/           # Stripe checkout + webhook
│   │   ├── platform/           # Platform status
│   │   ├── rider/              # Rider insight + delivery reports
│   │   └── routing/            # OSRM proxy
│   ├── globals.css
│   ├── layout.tsx              # Root layout (fonts, Toaster)
│   ├── manifest.ts             # PWA manifest
│   └── page.tsx                # Landing / redirect
│
├── components/                 # React UI components
│   ├── admin/                  # Admin dashboard widgets
│   ├── auth/                   # Auth page backgrounds
│   ├── pwa/                    # Install prompt, add-to-home
│   ├── rider/                  # Rider dashboard cards
│   └── ui/                     # Shared design system primitives
│
├── lib/                        # Business logic (no React)
│   ├── adjudicator/
│   │   └── run.ts              # Parametric adjudicator engine (675 lines)
│   ├── fraud/
│   │   └── detector.ts         # 7-check fraud detection
│   ├── ml/
│   │   ├── next-week-risk.ts   # Predictive claims forecast
│   │   └── premium-calc.ts     # Dynamic weekly premium (₹79–₹149)
│   ├── routing/
│   │   └── osrm.ts             # OSRM routing client
│   ├── supabase/
│   │   ├── admin.ts            # Service-role Supabase client
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── middleware.ts      # Session refresh helper
│   │   └── server.ts           # Server-side Supabase client
│   ├── types/
│   │   ├── css.d.ts            # CSS module ambient declaration
│   │   ├── database.ts         # Shared TypeScript interfaces
│   └── utils/
│       ├── auth.ts             # isAdmin() + getAdminEmails()
│       └── geo.ts              # Turf.js geospatial utilities
│
├── supabase/
│   ├── functions/
│   │   └── enterprise-adjudicator/   # Deno Edge Function (alternative)
│   └── migrations/             # SQL migrations (timestamp order)
│
├── docs/                       # This Starlight docs site
│
├── scripts/
│   └── setup-storage.ts        # One-time Supabase storage bucket setup
│
├── public/                     # Static assets (PWA icons)
├── middleware.ts               # Next.js edge middleware (session refresh)
├── next.config.ts              # Next.js config (PWA, standalone output)
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                 # Cron schedules, Mumbai region
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
| `payments/` | `/api/payments/` | Stripe Checkout and webhook |
| `platform/` | `/api/platform/` | Live platform operational status |
| `rider/` | `/api/rider/` | Rider AI insight, delivery impact reports |
| `routing/` | `/api/routing/` | OSRM route calculation proxy |

---

### `lib/`

Pure business logic. Nothing in `lib/` imports React or Next.js framework code - only Node.js built-ins and third-party libraries.

| Module | Responsibility |
|---|---|
| `adjudicator/run.ts` | Discover zones → check triggers → run fraud checks → insert claims |
| `fraud/detector.ts` | Seven independent fraud check functions + `runAllFraudChecks()` orchestrator |
| `ml/premium-calc.ts` | Stateless premium formula + DB helpers for historical event count |
| `ml/next-week-risk.ts` | Forecast-based or historical claims prediction for admin dashboard |
| `supabase/*.ts` | Context-appropriate Supabase client factories |
| `utils/auth.ts` | `isAdmin()` - checks email list or profile role |
| `utils/geo.ts` | `isWithinCircle()`, `distanceKm()`, `buildCirclePolygon()`, `reverseGeocode()` |
| `types/database.ts` | TypeScript interfaces for all DB tables |

---

### `components/`

| Directory | Contents |
|---|---|
| `ui/` | Design system atoms: `Button`, `Card`, `GlassCard`, `MetricCard`, `StatusBadge`, `DataTable`, `ZoneMap`, `GoeyToaster` |
| `rider/` | Domain components: `DashboardContent`, `PolicyCard`, `WalletBalanceCard`, `RealtimeWallet`, `RiskRadar`, `PredictiveAlert`, `ClaimVerificationPrompt` |
| `admin/` | Admin-specific: `AnalyticsCharts`, `FraudList`, `TriggersList`, `DemoTriggerPanel`, `SystemHealth`, `RunAdjudicatorButton` |
| `auth/` | `AuthBackground` - animated gradient for auth pages |
| `pwa/` | `InstallPrompt`, `AddToHomeScreen` - PWA install UI |

---

### `supabase/migrations/`

Apply migrations in timestamp order. Each file name contains a timestamp prefix.
