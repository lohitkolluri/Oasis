# Oasis

**AI-powered parametric wage protection for India's Q-commerce delivery partners.**

Oasis safeguards gig workers (Zepto, Blinkit) against income loss caused by external disruptions—extreme weather, zone lockdowns, curfews—through automated, zero-touch claims and weekly pricing aligned with their earnings cycle.

---

## Persona & Scenarios

**Target:** Q-commerce delivery partners (Zepto, Blinkit).

Q-commerce relies on strict 10-minute delivery SLAs. Minor external disruptions cause large drops in order completion and earnings. These workers are especially vulnerable to income loss from events they cannot control.

### Scenario 1: Extreme heat

Rahul delivers for Blinkit in Bangalore. When temperatures exceed 43°C for 3+ hours, he logs off for safety. Oasis detects the event via the weather API and automatically credits his protected wage to his wallet—no claim form, no waiting.

### Scenario 2: Zone lockdown / curfew

Priya delivers for Zepto in Mumbai. An unplanned curfew or strike blocks her primary zone. News and traffic APIs detect the disruption; the LLM verifies severity. Riders in the affected geofence receive instant parametric payouts for lost hours.

### Scenario 3: Heavy rain / waterlogging

During monsoon, localized flooding halts deliveries in a specific area. Tomorrow.io and traffic data identify the event. Active policyholders in that zone get automated payouts for lost income.

---

## Workflow

1. **Onboarding:** Rider signs up, selects platform (Zepto/Blinkit), and optional delivery zone.
2. **Weekly policy:** Rider subscribes to coverage for the coming week. Premium is calculated dynamically based on zone risk.
3. **Parametric monitoring:** APIs (weather, traffic, news) continuously monitor for qualifying disruptions.
4. **Trigger & payout:** When a disruption meets criteria, the system identifies affected riders and initiates payouts automatically. Rider wallet updates in real time via Supabase Realtime.
5. **Fraud checks:** Anomaly detection flags GPS spoofing, mismatched weather data, and duplicate claims.

---

## Weekly Premium Model

Gig workers are paid weekly. Oasis uses a **strictly weekly pricing model**:

- **Policy period:** Monday–Sunday.
- **Premium:** Calculated each Sunday for the following week.
- **Dynamic factors:** Zone historical disruption frequency, next-week weather forecast, rider behavior (e.g., heeding risk alerts).
- **Example:** A rider in a low-waterlogging zone with a clear forecast may get a 10% discount; a high-risk zone may see a higher premium.

---

## Parametric Triggers

| Trigger                | Source                   | Threshold / Logic                          |
| ---------------------- | ------------------------- | ----------------------------------------- |
| Extreme heat           | Tomorrow.io               | >43°C for 3+ hours                        |
| Heavy rain / flooding  | Tomorrow.io               | Rain >15mm/hr, waterlogging signals       |
| Severe AQI             | Ambee                     | AQI above lockout threshold               |
| Zone curfew / strike   | NewsData.io + LLM         | LLM verifies local news / social impact   |
| Traffic gridlock       | Google Maps               | Severe congestion / road closures        |

All triggers target **loss of income only**. No coverage for health, life, accidents, or vehicle repairs.

---

## Platform Choice: Web (PWA)

We use a **mobile-first web app** that can be installed as a PWA for both riders and admins:

- **Reach:** No app store delay; works across devices.
- **Updates:** Instant deploys without user updates.
- **Install prompts:** Android/Chrome show an install banner; iOS users can use Share → Add to Home Screen.
- **Shortcuts:** Installed PWA offers quick shortcuts to Rider Dashboard and Admin Dashboard.
- **Offline fallback:** Service worker caches assets and shows an offline page when connectivity is lost.
- **Dark mode:** High contrast for outdoor/night use and battery savings.
- **Speed:** Next.js + Turbopack for fast iteration during the hackathon.

---

## AI/ML Integration

1. **Dynamic premium calculation (Weekly)**
   - Inputs: Historical zone disruptions, next-week forecast, rider activity.
   - Model: Simple regression or Scikit-learn pipeline, run weekly via cron.
   - Output: Per-rider weekly premium for the next week.

2. **Fraud detection**
   - GPS spoofing: Flag erratic location jumps.
   - Weather mismatch: Compare claim timestamps with historical weather.
   - Duplicate claims: Same device, overlapping time windows.

3. **LLM verification**
   - OpenRouter (`openrouter/free`) analyzes news/traffic data to determine if an event qualifies as a zone-closure disruption.
   - Reduces false positives from raw APIs.

---

## Tech Stack

| Layer        | Stack                                                    |
| ------------ | -------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand, Framer Motion |
| Backend      | Supabase (PostgreSQL, Auth, Realtime, Edge Functions)     |
| AI/LLM       | OpenRouter API                                           |
| APIs         | Tomorrow.io, Ambee, NewsData.io, Google Maps              |
| Payments     | Razorpay / Stripe (test mode)                             |
| Deployment   | Vercel / Dokploy                                         |

---

## Development Plan

- **Phase 1 ✓:** Foundation, Idea doc, DB schema, auth, minimal dashboard.
- **Phase 2 ✓:** Policy subscription, payment sandbox, parametric adjudicator, 3–5 triggers, Realtime UI.
- **Phase 3 ✓:** Fraud detection (duplicate, rapid-claims), admin dashboard, instant payout demo, final polish.

---

## Getting Started

```bash
# Install
npm install

# Copy env
cp .env.local.example .env.local
# Add Supabase URL and anon key (required for auth)
# For payments: set Razorpay test keys, or PAYMENT_DEMO_MODE=true for dev

# Run
npm run dev
```

Apply Supabase migrations from `supabase/migrations/` to your project.

### Cron (Vercel)
Set `CRON_SECRET` in Vercel env. Cron routes: `/api/cron/adjudicator` (hourly), `/api/cron/weekly-premium` (Sundays).

---

## License

MIT
