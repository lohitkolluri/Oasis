# Admin Dashboard – Full Context for Oasis

Use this document when building or modifying the admin dashboard so the entire surface area, product context, and patterns are clear.

---

## 1. Product: Oasis

- **What it is:** AI-powered parametric insurance for India's Q-commerce delivery partners (e.g. Zepto, Blinkit). Riders pay a **weekly** premium; when external disruptions (extreme weather, zone lockdowns, AQI, traffic) hit their coverage zone, they get **automated payouts** with zero manual claims.
- **Critical constraints (do not violate):**
  - **Scope:** Coverage is ONLY loss of income from external disruptions. No health, life, accident, or vehicle repair coverage.
  - **Pricing:** Weekly only (no monthly/annual).
  - **Parametric automation:** Triggers and payouts are automated; no manual claims processing. Triggers come from real APIs: Tomorrow.io, Ambee, NewsData, TomTom, etc.

---

## 2. Design System & Conventions

- **Theme:** Dark charcoal. Background `#0f0f0f`, panels `#161616`, cards `#1e1e1e`. Neon accents: cyan `#7dd3fc`, violet `#a78bfa`, emerald `#22c55e`, amber `#f59e0b`, red `#ef4444`.
- **UI style:** Clean, minimal (Linear/Vercel/Stripe). Glass-style cards: `backdrop-blur`, `rounded-2xl`, soft shadow. No “Active”/“Live” flashy badges; understated status. No mock/synthetic data; honest empty states.
- **Typography:** Inter (body), Geist (display), JetBrains Mono (mono). See `app/globals.css` and CSS variables (`--surface-1`, `--border`, `--primary`, etc.).
- **Components:** Prefer `Card`, `KPICard`, `Button`, `Input`, `ScrollArea`, `Separator`, `Skeleton` from `components/ui/`. Admin-specific components live in `components/admin/`.
- **Enhancement components (Magic UI / Aceternity style):** `BlurFade` (blur-in on scroll), `BorderBeam` (subtle top-edge gradient sweep), `NumberTicker` (count-up for KPIs). Use `animateValue` and `showBorderBeam` on `KPICard` for a more polished dashboard. `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` in `components/ui/table.tsx` for semantic admin tables.

---

## 3. Admin Layout & Access

- **Route group:** `app/(admin)/admin/`. Layout: `app/(admin)/admin/layout.tsx`.
- **Auth:** Layout checks `auth.getUser()` and `profiles.role`; only admin users see admin. Others redirect to `/dashboard`.
- **Layout structure:**
  - **Sidebar (desktop):** Fixed left, 260px. Logo + “Oasis / Admin Console”, `AdminNav`, separator, “Rider App” link to `/dashboard`.
  - **Header:** Sticky, 48px. On desktop: `AdminSearch`; “Rider App” link. On mobile: Logo + “Oasis Admin”.
  - **Main:** `max-w-[1400px] mx-auto`, padding `px-6 py-6 lg:px-8`.

---

## 4. Admin Routes & Pages

| Route | Purpose | Key data / components |
|-------|---------|------------------------|
| `/admin` | Overview | Merged analytics: `AnalyticsCharts` (summary strip, claims & payouts area chart, loss ratio bar chart, trigger breakdown + severity pie), `RunAdjudicatorButton`. Last 30 days. |
| `/admin/analytics` | Redirect | Redirects to `/admin`. |
| `/admin/riders` | Riders list | `profiles` (name, platform, zone, joined); table with link to `/admin/riders/[id]` |
| `/admin/riders/[id]` | Rider detail | Profile, policies, claims, gov ID avatar, zone map; `AdminRiderActions`, `RoleSelector`, `ClaimReviewButtons`, `RiderGovernmentIdAvatar`, `ZoneMapLazy` |
| `/admin/policies` | Policy monitoring | `weekly_policies` + `profiles` + `plan_packages`; KPIs (active count, total premium, plans in use); table with rider/plan, week, premium, status |
| `/admin/triggers` | Trigger feed | `live_disruption_events`; `TriggersList`; severity badges (High/Medium) |
| `/admin/fraud` | Fraud queue | Flagged claims from `parametric_claims`; KPIs (pending, reviewed, total); `FraudList` (approve/reject) |
| `/admin/payments` | Payment logs | `payment_transactions` + optional Stripe intents; KPIs (total collected, mismatches, reconciliation); table of status, amount, policy, Stripe, date |
| `/admin/health` | System health | `SystemHealth` (last adjudicator run, errors 24h, external APIs, recent events); full `system_logs` table |
| `/admin/demo` | Demo | `DemoTriggerPanel` (synthetic disruption presets, rider select); recent `adjudicator_demo` runs from `system_logs` |

---

## 5. Admin Components (components/admin/)

| Component | Type | Purpose |
|-----------|------|---------|
| `AdminNav` | Client | Sidebar nav: Operations (Overview, Policies, Triggers, Riders), Financial (Payments), Review (Fraud Queue, System Health, Demo). Exports `adminNavItems` for search. |
| `AdminSearch` | Client | Header search; filters `adminNavItems` by label/href; Enter goes to first match; dropdown with quick nav. |
| `AdminInsights` | Client | Fetches `/api/admin/insights`. Shows “Priorities” (fraud, reports, triggers, claims) with values, notes, links; optional watchlist. |
| `AdminLiveFeed` | Client | Supabase realtime on `parametric_claims` (INSERT/UPDATE), `live_disruption_events` (INSERT), `weekly_policies` (UPDATE). Shows last 20 events (claim created/paid/flagged, disruption, policy activated). Accepts `summary24h` for empty-state summary. |
| `OverviewStatus` | Client | Fetches `/api/admin/system-health`; one-line status + “Details” link to `/admin/health`. |
| `RunAdjudicatorButton` | Client | POST `/api/admin/run-adjudicator`; shows loading and result (candidates_found, claims_created or error). Toasts via gooey-toast. |
| `KPICard` | UI | Used across Overview, Policies, Fraud, Payments. Props: title, label, value, accent (cyan, violet, emerald, amber, blue). |
| `FraudList` | Client | Pending vs reviewed sections; per-claim Approve/Reject via POST `/api/admin/review-claim` (claimId, action). |
| `ClaimReviewButtons` | Client | Same approve/reject logic; used on rider detail page for each claim. |
| `TriggersList` | Client | Table of `live_disruption_events`: event type, zone (from geofence), severity (High ≥8, Medium 5–7, Low), verified_by_llm, time. AQI/subtype details from `raw_api_data`. |
| `SystemHealth` | Client | Fetches `/api/admin/system-health`. Shows status, last adjudicator run (runId, at, candidatesFound, claimsCreated, durationMs, errors), errors24h, external APIs list, recent logs. Refreshes every 60s. |
| `DemoTriggerPanel` | Client | Presets (extreme_heat, heavy_rain, severe_aqi, traffic_gridlock, zone_curfew) with lat/lng; optional rider filter. POST `/api/admin/demo-trigger`. Shows result (candidates_found, claims_created, etc.). |
| `AnalyticsCharts` | Client | Fetches `/api/admin/analytics`. Recharts: summary stats, claims timeline, premiums timeline, loss ratio timeline, trigger breakdown (pie), severity buckets. |
| `AdminRiderActions` | Client | Rider-level actions (e.g. create policy, cancel policy) using `/api/admin/update-policy` or similar; receives riderId, policies, plans. |
| `RoleSelector` | Client | Toggle rider/admin role; POST `/api/admin/update-role`. |
| `RiderGovernmentIdAvatar` | Server/client | Shows rider avatar or gov ID thumbnail; signed URL from Supabase storage `government-ids` bucket. |
| `StatCard` | Presentational | Used for numeric stats in admin. |

---

## 6. Admin API Routes (app/api/admin/)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/insights` | GET | Returns priorities (fraud count, reports count, triggers count, claims count) and watchlist for AdminInsights. |
| `/api/admin/system-health` | GET | Returns status, errors24h, lastAdjudicatorRun, apis[], recentLogs[]. Used by OverviewStatus and SystemHealth. |
| `/api/admin/run-adjudicator` | POST | Runs adjudicator; returns candidates_found, claims_created, error. |
| `/api/admin/review-claim` | POST | Body: { claimId, action: 'approved' \| 'rejected' }. Updates claim admin_review_status, reviewed_by. |
| `/api/admin/analytics` | GET | Returns summary, claimsTimeline, premiumsTimeline, lossRatioTimeline, triggerBreakdown, severityBuckets (last 30 days). |
| `/api/admin/demo-trigger` | POST | Body: preset/rider/zone params. Runs demo adjudicator; returns candidates_found, claims_created, etc. |
| `/api/admin/update-role` | POST | Updates profile role (rider/admin). |
| `/api/admin/update-policy` | POST | Creates/updates/cancels weekly policy for a rider. |
| `/api/admin/rotate-logs` | POST | Optional; rotates or archives system_logs. |

All admin APIs must enforce admin auth (e.g. check session + profile.role).

---

## 7. Key Supabase Tables (Admin)

- **profiles:** id, full_name, phone_number, platform, role, primary_zone_geofence, zone_latitude, zone_longitude, government_id_url, created_at.
- **weekly_policies:** id, profile_id, plan_id, week_start_date, week_end_date, weekly_premium_inr, is_active, created_at. Relations: profiles, plan_packages.
- **parametric_claims:** id, policy_id, payout_amount_inr, status, is_flagged, flag_reason, admin_review_status, reviewed_by, created_at.
- **live_disruption_events:** id, event_type, severity_score, verified_by_llm, geofence_polygon, raw_api_data, created_at.
- **payment_transactions:** id, profile_id, weekly_policy_id, amount_inr, status, stripe_payment_intent_id, paid_at, created_at.
- **system_logs:** id, event_type, severity, metadata, created_at. event_type e.g. adjudicator_run, adjudicator_demo.
- **plan_packages:** id, name, slug, weekly_premium_inr, payout_per_claim_inr, is_active, sort_order.
- **rider_delivery_reports:** (optional) for report counts in insights.

Admin reads use `createAdminClient()` from `@/lib/supabase/admin` (service role) so RLS does not block. Rider-facing app uses normal Supabase client with RLS.

---

## 8. Data Flow Summary

- **Overview:** Server component fetches policies, claims, profiles count, claims24h; passes summary24h to AdminLiveFeed. RunAdjudicatorButton and AdminInsights/OverviewStatus are client and call their APIs.
- **Lists (Riders, Policies, Triggers, Fraud, Payments):** Server components fetch via admin client and render tables/cards; FraudList and TriggersList receive data as props and may have client-side actions (review, etc.).
- **Rider detail:** Server fetches profile, policies, plans, claims, geocode, gov ID signed URL; passes to AdminRiderActions, RoleSelector, ClaimReviewButtons, RiderGovernmentIdAvatar, ZoneMapLazy.
- **Analytics / Health / Demo:** Page is thin; main logic in client components that fetch from `/api/admin/analytics`, `/api/admin/system-health`, and `/api/admin/demo-trigger`.

---

## 9. File Map (Quick Reference)

```
app/(admin)/admin/
  layout.tsx          # Auth + sidebar + header + main
  page.tsx            # Overview
  riders/page.tsx
  riders/[id]/page.tsx
  policies/page.tsx
  triggers/page.tsx
  fraud/page.tsx
  analytics/page.tsx
  payments/page.tsx
  health/page.tsx
  demo/page.tsx
  **/loading.tsx      # Route-level loading where present

components/admin/
  AdminNav.tsx
  AdminSearch.tsx
  AdminInsights.tsx
  AdminLiveFeed.tsx
  OverviewStatus.tsx
  RunAdjudicatorButton.tsx
  FraudList.tsx
  ClaimReviewButtons.tsx
  TriggersList.tsx
  SystemHealth.tsx
  DemoTriggerPanel.tsx
  AnalyticsCharts.tsx
  AdminRiderActions.tsx
  RoleSelector.tsx
  RiderGovernmentIdAvatar.tsx
  StatCard.tsx

app/api/admin/
  insights/route.ts
  system-health/route.ts
  run-adjudicator/route.ts
  review-claim/route.ts
  analytics/route.ts
  demo-trigger/route.ts
  update-role/route.ts
  update-policy/route.ts
  rotate-logs/route.ts
```

Use this context when implementing or refactoring any part of the admin dashboard so behavior and styling stay consistent with the rest of Oasis.
