# Oasis – Verification Report & Cleanup List

**Date:** 2026-03-08  
**Scope:** Supabase integration verification, schema alignment, and optimization/cleanup checklist.

---

## 1. Verification Summary

### 1.1 Supabase connection and schema

- **Project:** Oasis (`qlrzndxpoxzeykikibro`), region `ap-northeast-1`, status **ACTIVE_HEALTHY**.
- **Env:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are used consistently via:
  - `lib/supabase/client.ts` (browser)
  - `lib/supabase/server.ts` (server, cookies)
  - `lib/supabase/admin.ts` (service role)
  - `lib/supabase/middleware.ts` (session refresh)

### 1.2 Schema vs code (verified via Supabase plugin)

| Database object           | Type  | Used in code | Status |
|---------------------------|-------|--------------|--------|
| `profiles`                | table | Yes          | OK     |
| `weekly_policies`         | table | Yes          | OK     |
| `live_disruption_events` | table | Yes          | OK     |
| `parametric_claims`       | table | Yes          | OK     |
| `premium_recommendations` | table | Yes          | OK     |
| `rider_delivery_reports`  | table | Yes          | OK     |
| `claim_verifications`    | table | Yes          | OK     |
| `plan_packages`          | table | Yes          | OK     |
| `system_logs`            | table | Yes          | OK     |
| `payment_transactions`    | table | Yes          | OK     |
| `app_config`             | table | Yes (cron)   | OK     |
| `rider_wallet`           | view  | Yes          | OK     |
| `zone_baseline_stats`     | view  | Yes (fraud)  | OK     |
| `payout_ledger`          | table | Yes          | **Fixed** – was missing; migration applied |

### 1.3 Fix applied

- **`payout_ledger`** was missing on the remote database. The migration `add_payout_ledger` was applied via the Supabase plugin so that:
  - `POST /api/payments/simulate-payout` works.
  - Adjudicator `simulatePayout()` can insert ledger rows.

### 1.4 Auth and routing

- **Middleware:** `updateSession()` runs for all routes except static/PWA assets; auth state is refreshed correctly.
- **Auth callback:** `app/(auth)/auth/callback/route.ts` exchanges code for session and redirects to `/dashboard` (or `next`).
- **Admin:** Admin routes use `createClient()` (server) for auth and `createAdminClient()` for data; admin guard checks `profile.role === 'admin'` and `ADMIN_EMAILS`.

### 1.5 Tables/views not used in app code (informational)

- **Views:** `aqi_zone_baselines`, `fraud_cluster_signals` exist in DB but are not referenced in the current app code. Safe to keep for future use or remove if confirmed unused.

---

## 2. Cleanable code and files

### 2.1 Dead or redundant code

| Location | Issue | Suggestion |
|----------|--------|------------|
| **`vitest.config.ts`** | Deleted in repo (per git status) but **vitest** still in `bun.lock` (pulled in by another dep or past dep) | Remove any vitest reference from `package.json` if present; run `bun install` to prune lockfile. If vitest is not in `package.json`, no change needed. |
| **`Docs/src/content/docs/api.md`** | Deleted | Confirm no links from docs index; remove from sidebar/nav if referenced. |
| **`Docs/src/content/docs/architecture.md`** | Deleted | Same as above. |
| **`Docs/src/content/docs/features/onboarding.md`** | Deleted | Same as above. |
| **`lib/utils/geo.ts`** | Comment says “Uses specific @turf subpackages instead of @turf/turf” but **`@turf/turf`** is still in `package.json` | Remove `@turf/turf` from `package.json`; keep only the smaller `@turf/*` packages actually imported (bbox, boolean-point-in-polygon, circle, distance, helpers). Reduces bundle size. |
| **Duplicate policy/wallet select patterns** | Dashboard and wallet page both do similar “policies + wallet” fetches | Consider a small server helper or shared query (e.g. `getRiderPoliciesAndWallet(profileId)`) to avoid duplication. |

### 2.2 Files to review for consolidation

| Area | Files | Suggestion |
|------|--------|------------|
| **Admin rider detail** | `app/(admin)/admin/riders/[id]/page.tsx`, `RiderGovernmentIdAvatar.tsx`, `AdminRiderActions.tsx`, `RoleSelector.tsx` | Already focused; ensure no duplicate fetches (e.g. profile loaded once and passed to children). |
| **Rider dashboard** | `DashboardContent.tsx`, `RealtimeWallet.tsx`, `WalletBalanceCard.tsx`, `WalletCard.tsx` | Two wallet-related components; confirm distinct roles or merge if overlapping. |
| **Claims** | `ClaimsPreview.tsx`, `ClaimVerificationPrompt.tsx`, claims page | Ensure single source of truth for “pending verification” state. |

### 2.3 Type and env consistency

| Item | Suggestion |
|------|------------|
| **`lib/types/database.ts`** | Add types for `payout_ledger` and any new columns (e.g. `weekly_policies.stripe_*`) so API and components stay in sync with DB. |
| **Stripe vs Razorpay** | Stripe-only: documented in `docs/PAYMENTS.md`; Razorpay code comments removed; DB columns kept for legacy data only. |
| **`.env.local`** | Done: README has full env table and "do not commit"; `scripts/configure-env.ts` includes all required/optional vars including `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. |

---

## 3. Dependencies – optimization and cleanup

### 3.1 Safe to remove (after quick verification)

| Dependency | Status |
|------------|--------|
| **`@turf/turf`** | Removed from `package.json`; `bun install` run; bundle size reduced. |

### 3.2 Keep but already optimized

| Dependency | Notes |
|------------|--------|
| **`lucide-react`** | Used across app; `optimizePackageImports` in `next.config.ts` is set. |
| **`recharts`** | Same; in `optimizePackageImports`. |
| **`@turf/*` (individual)** | Used in `lib/utils/geo.ts` for geofence/zone logic. |
| **`maplibre-gl`** | Used in onboarding (map) and `ZoneMap.tsx`; dynamically imported. |
| **`framer-motion`** | Used in many UI components. |
| **`goey-toast`** | Used for toasts; styles imported in `GoeyToaster.tsx`. |
| **`stripe`** | Checkout and webhook. |
| **`@supabase/ssr` + `@supabase/supabase-js`** | Core Supabase integration. |
| **`@ducanh2912/next-pwa`** | PWA with offline fallback; used in `next.config.ts`. |

### 3.3 Dev-only / optional

| Dependency | Notes |
|------------|--------|
| **`dotenv`** | Often redundant with Next.js env loading; can remove if not used in scripts. |
| **`tsx`** | Used for scripts (e.g. `setup-storage`, `configure-env`); keep. |
| **`vitest`** | Not in `package.json`; only in lockfile. No action unless you re-add tests. |

---

## 4. Quick verification commands

- **Supabase:** Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **DB push (local migrations):** `npx supabase db push` or use Supabase dashboard to confirm migrations.
- **App:** `bun run dev` → login, dashboard, wallet, claims, admin riders and demo trigger.
- **Stripe (if used):** Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for checkout and webhooks.

---

## 5. Summary

- **Integration:** Supabase client/server/admin and middleware are wired correctly; schema matches app usage after adding `payout_ledger`.
- **Fix applied:** `payout_ledger` table created on the linked Supabase project so simulate-payout and adjudicator payouts work.
- **Cleanup:** Remove `@turf/turf`; optionally consolidate duplicate fetch patterns and document Stripe vs Razorpay; tidy deleted docs and vitest if needed.
- **Dependencies:** All other listed deps are in use; PWA, Stripe, and Supabase are correctly integrated.
