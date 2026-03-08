# Oasis Refactoring Roadmap

**Goal:** Move the codebase toward enterprise-grade production quality through phased, prioritized improvements.

This roadmap is derived from an architecture and code review of the codebase and organizes work into five phases. Each phase has clear deliverables, acceptance criteria, and estimated scope. Dependencies between phases are noted so you can schedule work and avoid rework.

---

## Overview

| Phase | Focus | Est. effort | Dependency |
|-------|--------|-------------|------------|
| **1** | Critical fixes | 1–2 sprints | None |
| **2** | Architecture improvements | 2–3 sprints | After Phase 1 |
| **3** | Performance optimization | 1–2 sprints | After Phase 2 (optional parallel) |
| **4** | Maintainability improvements | 2–3 sprints | After Phase 1; can overlap Phase 2/3 |
| **5** | Observability and operations | 1–2 sprints | After Phase 1; benefits from Phase 4 |

---

## Phase 1 – Critical Fixes

**Objective:** Eliminate security and correctness risks that could cause data loss, unauthorized access, or silent failures in production.

### 1.1 Require and validate cron and webhook secrets

- **Current risk:** If `CRON_SECRET` is unset, `GET /api/cron/adjudicator` and `GET /api/cron/weekly-premium` run without authentication. Same pattern for disruption webhook when both `WEBHOOK_SECRET` and `CRON_SECRET` are unset.
- **Tasks:**
  1. In `app/api/cron/adjudicator/route.ts` and `app/api/cron/weekly-premium/route.ts`: require `CRON_SECRET` in production (e.g. `NODE_ENV === 'production'`). If missing, return **503** with a clear message; do not run the job.
  2. In `app/api/webhooks/disruption/route.ts`: require `WEBHOOK_SECRET` (or a dedicated disruption secret). Do not fall back to `CRON_SECRET` for webhook auth so cron and webhook keys are separate.
  3. Document in README and deployment docs: "In production, set CRON_SECRET and WEBHOOK_SECRET; cron endpoints return 503 if CRON_SECRET is missing."
- **Acceptance criteria:** Unauthenticated GET to cron endpoints in production returns 503 when secret is missing; webhook uses its own secret; docs updated.

### 1.2 Stripe webhook idempotency and atomicity

- **Current risk:** Duplicate Stripe events can double-activate a policy and create duplicate payment_transactions; no transaction around policy + payment updates.
- **Tasks:**
  1. **Idempotency:** Before updating policy or payment_transactions, check if this Stripe `event.id` (or `event.id` + `session.id`) was already processed (e.g. new table `stripe_webhook_events(id, event_id, processed_at)` or key in Redis). If already processed, return `200` with `{ ok: true }` and do no further work.
  2. **Atomicity:** Wrap policy update and payment_transactions insert/update in a single Supabase RPC (e.g. `process_checkout_completed(policy_id, session_id, payment_intent_id, ...)`) that runs in one transaction, or use a small state machine (e.g. insert “processing,” then update to “completed”) so partial states can be detected and retried safely.
  3. Add a test (or manual runbook) that sends the same `checkout.session.completed` event twice and asserts policy is activated once and payment_transactions has one row per policy.
- **Acceptance criteria:** Duplicate webhook delivery does not double-activate or double-insert; single DB transaction or documented compensation; test or runbook exists.

### 1.3 Environment validation at startup

- **Current risk:** Missing `NEXT_PUBLIC_SUPABASE_URL` or anon key causes runtime throws in middleware/server; other required vars are discovered only when a route is hit.
- **Tasks:**
  1. Add `lib/config/env.ts` (or extend `constants.ts`) that validates required env vars (e.g. Supabase URL/key, and in production: CRON_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET). Use a small schema (e.g. Zod) and run validation once at app init or first use.
  2. In production, if validation fails: log clearly and return 503 for affected routes (or fail fast in a serverless entry if possible). Do not use non-null assertions (`!`) on env without a prior check.
  3. Document required vs optional vars per environment (dev / staging / prod) in README or `docs/development-setup.md`.
- **Acceptance criteria:** Missing required env in prod results in 503 or fail-fast, not unhandled throw; list of required vars documented.

### 1.4 Stop silent failures in adjudicator

- **Current risk:** `simulatePayout`, `logRun`, and many weather/AQI/news branches use empty or minimal `catch` blocks; operators have no signal when payouts or logging fail.
- **Tasks:**
  1. In `simulatePayout` and `logRun`: log errors with context (e.g. claimId, runId, table name) and rethrow or set a “run had errors” flag. Optionally write a row to `system_logs` with `event_type: 'adjudicator_error'` and metadata `{ step, error, claimId? }`.
  2. In `runAdjudicator`: aggregate “partial failure” state (e.g. `payoutFailures: number`, `logFailures: number`) and include in result and in `system_logs` so monitoring can alert.
  3. For external API `catch` blocks (weather, AQI, news): at minimum log once per run with level `warn` and context (e.g. zone, provider name); avoid silent skip-only behavior in production.
- **Acceptance criteria:** No silent catch that hides failure; every failure path logs or writes to system_logs; adjudicator result or system_logs reflects run outcome (success/partial/fail).

### 1.5 Secure Supabase client initialization

- **Current risk:** `lib/supabase/middleware.ts` and `lib/supabase/server.ts` use `process.env.NEXT_PUBLIC_*!`; missing env causes crashes.
- **Tasks:**
  1. Use the new env validation (1.3); ensure Supabase URL and anon key are validated before any client is created.
  2. In middleware and server client factory: if env is missing (e.g. validation not run yet), return a response that triggers 503 or redirect to an error page instead of throwing.
  3. Remove non-null assertions on env in these files; rely on validated config object.
- **Acceptance criteria:** No unguarded `!` on env for Supabase; missing config yields 503 or controlled error, not crash.

**Phase 1 implementation (done):** Env is validated via `lib/config/env.ts`. Cron routes require `CRON_SECRET` in production (503 if missing). Disruption webhook uses `WEBHOOK_SECRET` only. Stripe webhook uses table `stripe_webhook_events` and RPC `process_checkout_completed`. **After deploying, run migration** `supabase/migrations/20240315000000_stripe_webhook_idempotency.sql` (e.g. `yarn db:migrate` or Supabase Dashboard → SQL).

---

## Phase 2 – Architecture Improvements

**Objective:** Improve separation of concerns, module boundaries, and consistency so the system is easier to change, test, and scale.

### 2.1 Split the adjudicator into modules

- **Current state:** `lib/adjudicator/run.ts` is a ~895-line monolith (zones, weather, AQI, news, LLM, events, policies, fraud, claims, payouts).
- **Tasks:**
  1. **Triggers:** Extract weather/AQI and news/LLM into `lib/adjudicator/triggers/` (e.g. `weather.ts`, `news.ts`) with clear interfaces: input (zone or config), output (list of `TriggerCandidate`). Keep `run.ts` as orchestrator that calls these and deduplicates.
  2. **Events:** Extract “insert event + duplicate check” into `lib/adjudicator/events.ts` (e.g. `ensureDisruptionEvent(supabase, candidate)` returning event id or null).
  3. **Matching and claims:** Extract policy-in-geofence resolution and claim creation into `lib/adjudicator/claims.ts` (e.g. `findEligiblePolicies`, `createClaimsAndPayouts`) so fraud and payout simulation are behind a single entry point.
  4. **Payouts:** Move `simulatePayout` (and future real payout) into `lib/adjudicator/payouts.ts` and call from claims module.
  5. Keep `run.ts` as a thin coordinator: get zones → get candidates (triggers) → for each candidate: ensure event → create claims/payouts (claims module). No business logic in `run.ts` beyond orchestration.
- **Acceptance criteria:** No file > ~300 lines; each module has a single responsibility; `runAdjudicator` and `processSingleTrigger` are thin; existing API (cron, webhook) unchanged.

### 2.2 Standardize admin API auth

- **Current state:** Some routes use `withAdminAuth` (analytics, run-adjudicator); others duplicate getUser + isAdmin (update-policy, update-role, demo-trigger, insights, system-health, review-claim).
- **Tasks:**
  1. Migrate all admin API routes to `withAdminAuth` from `lib/utils/admin-guard.ts`. Remove inline `createClient` + `getUser` + `isAdmin` from: `update-policy`, `update-role`, `demo-trigger`, `insights`, `system-health`, `review-claim`.
  2. Ensure `withAdminAuth` is the single place that enforces rate limit + auth + profile fetch; document that any new admin route must use it.
  3. Add a simple integration test or smoke test that asserts unauthenticated and non-admin requests to an admin endpoint return 401/403.
- **Acceptance criteria:** Every admin route uses `withAdminAuth`; no duplicated auth logic; test or runbook verifies 401/403.

### 2.3 Single Supabase client usage for server-side and adjudicator

- **Current state:** Adjudicator and disruption webhook create a Supabase client via `createClient(url, key)` from env; rest of app uses `createAdminClient()` from `lib/supabase/admin`.
- **Tasks:**
  1. Use `createAdminClient()` (or a dedicated `createAdjudicatorClient()` that uses the same env validation) everywhere server-side code needs service role: adjudicator `run.ts`, disruption webhook, and any other server-only paths.
  2. Centralize env reading for Supabase in `lib/config/env.ts` (or existing config); admin and adjudicator both consume the same validated config so missing keys are caught once at startup.
- **Acceptance criteria:** No direct `createClient(process.env.*)` in app code; single factory and single source of env for Supabase.

### 2.4 Shared utilities and constants

- **Current state:** `clusterKey(lat, lng)` duplicated in adjudicator and weekly-premium cron; date `toISOString().split('T')[0]` repeated in many places; magic numbers (e.g. 30 km for duplicate detection).
- **Tasks:**
  1. Add `lib/utils/date.ts` with e.g. `toDateString(d: Date): string` and use it wherever “date only” is needed.
  2. Add `lib/utils/geo.ts` (or extend existing) with `clusterKey(lat, lng)` and import in adjudicator and weekly-premium cron.
  3. Move duplicate-detection radius and similar magic numbers into `lib/config/constants.ts` (e.g. under `TRIGGERS` or `ADJUDICATOR`) with named constants.
- **Acceptance criteria:** No duplicate `clusterKey` or date-split logic; magic numbers replaced by named constants.

**Phase 2 implementation (done):** Adjudicator split into `lib/adjudicator/types.ts`, `triggers/weather.ts`, `triggers/news.ts`, `zones.ts`, `events.ts`, `payouts.ts`, `claims.ts`; `run.ts` is a thin orchestrator. All admin routes use `withAdminAuth`. Cron and webhook use `createAdminClient()`. Added `lib/utils/date.ts` (`toDateString`), `clusterKey` in `lib/utils/geo.ts`, and `TRIGGERS.DUPLICATE_EVENT_RADIUS_KM`, `CANDIDATE_DEDUPE_RADIUS_KM`, `NEWS_GEOFENCE_RADIUS_KM`, `NEWS_GEOFENCE_RADIUS_KM_COUNTRY` in constants.

### 2.5 Optional: repository or service layer for claims and payouts

- **Scope:** Lower priority; do after 2.1 if you want a clear persistence boundary.
- **Tasks:**
  1. Introduce a small `lib/adjudicator/repository.ts` (or per-entity) that wraps Supabase inserts/updates for `live_disruption_events`, `parametric_claims`, and `payout_ledger`. Adjudicator orchestration calls the repository instead of `supabase.from(...)` directly.
  2. This sets the stage for idempotency keys, auditing, or swapping storage later without touching business logic.
- **Acceptance criteria:** Claim and payout writes go through a single module; adjudicator orchestration does not call `supabase.from` for these tables.

---

## Phase 3 – Performance Optimization

**Objective:** Reduce latency and resource use, and prepare for multi-instance or serverless scaling.

### 3.1 Distributed rate limiting and API cache

- **Current state:** Rate limit and `fetchWithRetry` cache are in-memory; ineffective across multiple instances.
- **Tasks:**
  1. Introduce a shared store for rate limits (e.g. Redis or Supabase with a small table/key-value). Replace `lib/utils/api.ts` in-memory map with an implementation that reads/writes to the shared store (e.g. `rateLimitKey` → get/increment with TTL). Keep the same `checkRateLimit` and `rateLimitKey` API so call sites don’t change.
  2. For external API cache: either use the same Redis (or similar) with TTL for `GET:url` keys, or accept per-instance cache and document that cron should run on a single instance. Prefer Redis (or Supabase) if you run multiple app instances.
  3. Document in deployment docs: required Redis (or alternative) for production if running more than one instance.
- **Acceptance criteria:** Rate limit is enforced across instances when shared store is configured; cache (if used) is shared or behavior is documented.

### 3.2 Reduce N+1 and batch fraud checks

- **Current state:** In `processSingleTrigger`, for each policy we call `runAllFraudChecks` and then `runExtendedFraudChecks`, each with DB round-trips.
- **Tasks:**
  1. Preload fraud-related data for the current set of policies and event (e.g. recent claims per policy, device fingerprints, verifications) in one or a few queries before the policy loop.
  2. Refactor fraud checks to accept preloaded data where possible (e.g. “recent claims for these policy IDs”) and run in-memory checks; only call DB for checks that truly need fresh data.
  3. Consider batching claim inserts (e.g. Supabase bulk insert) instead of one insert per policy, if the API supports it and RLS/triggers allow.
- **Acceptance criteria:** Fewer DB round-trips per adjudicator run; no behavioral change to fraud outcomes.

### 3.3 Optional: parallelize trigger processing

- **Current state:** Candidates are processed sequentially in `runAdjudicator`.
- **Tasks:**
  1. Process candidates in parallel with a concurrency cap (e.g. 3–5 at a time) to reduce total run time. Ensure shared state (e.g. “already paid this phone this run”) is handled correctly (e.g. shared set passed to each call or merged after).
  2. Add a constant for concurrency (e.g. in `constants.ts`) and document.
- **Acceptance criteria:** Adjudicator run time decreases when there are many candidates; no duplicate payouts or incorrect state.

**Phase 3 implementation (done):** Rate limiting uses a shared store: `lib/utils/rate-limit-store.ts` with in-memory fallback and Supabase backend via `rate_limit_entries` table and `rate_limit_check` RPC. Run migration `20240316000000_rate_limit_store.sql`. `checkRateLimit` is now async. Fraud: `preloadFraudData()` in `lib/fraud/detector.ts` preloads duplicate and rapid-claims data; `runAllFraudChecks()` accepts optional `preloaded`; `claims.ts` preloads once per event. Trigger processing: candidates are processed in parallel with cap `ADJUDICATOR.TRIGGER_CONCURRENCY` (default 3) in `run.ts`. External API cache remains per-instance (no Redis).

---

## Phase 4 – Maintainability Improvements

**Objective:** Improve testability, reduce duplication, and make the codebase easier to evolve safely.

### 4.1 Restore and grow the test suite

- **Current state:** No Vitest (or other) tests; `vitest.config.ts` was removed.
- **Tasks:**
  1. Re-add Vitest (or chosen runner) and a minimal config; ensure CI runs tests.
  2. **Unit tests:** Fraud checks (`lib/fraud/detector.ts`): duplicate claim, rapid claims, weather mismatch, location verification. Geo helpers: `isWithinCircle`, `clusterKey`, `toDateString`. Adjudicator: trigger parsing (e.g. `parseBody` in disruption webhook), `sanitizeForLlm`.
  3. **Integration tests:** Stripe webhook idempotency (same event twice → single activation). Cron: with valid CRON_SECRET returns 200; without (in prod) returns 503. Use test env and mocks where needed (e.g. Stripe, Supabase local).
  4. Document how to run tests and what they cover in README.
- **Acceptance criteria:** Tests run in CI; critical paths (fraud, webhook idempotency, cron auth) are covered; README updated.

### 4.2 Input validation with a schema library

- **Current state:** Many handlers use `body as { planId?, weekStart?, ... }` without validation.
- **Tasks:**
  1. Add Zod (or similar) and define request schemas for: create-checkout (planId, weekStart, weekEnd), update-policy (policyId, isActive, planId), update-role (profileId, role), disruption webhook body, and any other admin or rider endpoints that take JSON.
  2. In each handler: parse body with the schema; on failure return 400 with validation errors. Use the parsed value (typed) for the rest of the handler.
  3. Validate UUIDs for ids (policyId, profileId, planId) where applicable.
- **Acceptance criteria:** Invalid or missing required fields return 400 with clear messages; no reliance on unvalidated `as` casts for request bodies.

### 4.3 Reduce logging of PII and secrets

- **Current state:** verify-face and gov-id routes log userId, content snippets, and similar.
- **Tasks:**
  1. Audit all `console.log`/`console.error`/`console.warn` in onboarding and verification routes; remove or redact PII and tokens. Keep only non-identifying identifiers (e.g. request id, “verification started/failed”) and safe metadata.
  2. Prefer a small logger (or use one from your stack) with levels so production can disable debug; ensure no secret or PII is ever logged.
- **Acceptance criteria:** No PII or secrets in log output; logging level configurable.

### 4.4 Fail secure for sensitive storage

- **Current state:** Gov ID and face photo can fall back to unencrypted storage when encryption key is missing.
- **Tasks:**
  1. In production, do not store government ID or face photos unencrypted when the corresponding encryption key is not set. Either return 503 with “KYC storage not configured” or mark the upload as “pending key” and do not mark as verified until key is set and re-encrypted.
  2. Document required keys for production (e.g. GOV_ID_ENCRYPTION_KEY, FACE_PHOTO_ENCRYPTION_KEY) in env docs.
- **Acceptance criteria:** No unencrypted fallback in production for sensitive buckets; docs list required keys.

### 4.5 Align types and database types

- **Current state:** `lib/types/database.ts` exists but some code uses inline types or `Record<string, unknown>`.
- **Tasks:**
  1. Use generated Supabase types (or your existing database types) for `profiles`, `weekly_policies`, `parametric_claims`, `live_disruption_events`, and payment tables in API and lib code where possible.
  2. Replace ad-hoc “raw” types in adjudicator (e.g. geofence, raw_api_data) with minimal interfaces that match DB and API contracts.
- **Acceptance criteria:** Core entities use shared types; fewer `as` casts and unknown shapes.

**Phase 4 implementation (4.2–4.5 done; 4.1 test suite skipped):** Zod schemas in `lib/validations/schemas.ts`, `parseWithSchema` in `lib/validations/parse.ts`; all create-checkout, update-policy, update-role, demo-trigger, review-claim, disruption webhook, simulate-payout routes use them. Onboarding verify-face and verify-government-id: PII/secrets removed from logs; in production, gov ID and face photo storage return 503 when encryption keys are missing or invalid (no unencrypted fallback). README documents GOV_ID_ENCRYPTION_KEY and FACE_PHOTO_ENCRYPTION_KEY as required in production. Adjudicator: `GeofenceCircle` and `RawTriggerData` in `lib/adjudicator/types.ts`; `TriggerCandidate` uses them; events, claims, run, and triggers use typed geofence.

---

## Phase 5 – Observability and Operations

**Objective:** Make the system observable, debuggable, and operable in production.

### 5.1 Correlation IDs and structured logging

- **Current state:** No request or run correlation; logs are free-form.
- **Tasks:**
  1. Generate a correlation ID per request (middleware or first handler) and per cron run; pass via async context or explicit parameter. Add to all log lines and to `system_logs` metadata for adjudicator runs.
  2. Introduce a small logger that accepts `{ level, message, requestId?, ...meta }` and outputs JSON (or a consistent format). Use it in API routes, adjudicator, and cron. Replace ad-hoc `console.*` in critical paths.
  3. Ensure production logs do not include PII (align with 4.3).
- **Acceptance criteria:** Every request and cron run has a correlation ID; logs are structured and include it; no PII in logs.

### 5.2 Adjudicator run outcome and alerts

- **Current state:** Run outcome is only partially visible; no clear “success / partial / failed” signal for alerting.
- **Tasks:**
  1. Write a single “run summary” to `system_logs` per adjudicator run: e.g. `event_type: 'adjudicator_run'`, metadata: `{ runId, duration_ms, candidates_found, claims_created, payouts_initiated, error?, payoutFailures?, logFailures? }`. Ensure Phase 1.4 error reporting is included.
  2. Define a simple SLO or alert rule (e.g. “adjudicator_run with error present” or “duration > N minutes”) and document how to configure it in your monitoring system (e.g. Supabase logs, Datadog, Vercel).
  3. Add a “last run” section to admin health or a dedicated status page that reads the latest `system_logs` row for `adjudicator_run`.
- **Acceptance criteria:** Every run produces one summary row; runbook or dashboard can alert on failure or slowness.

### 5.3 Health checks and deployment docs

- **Current state:** Health endpoint checks env and possibly one external API; no DB or Stripe check.
- **Tasks:**
  1. Extend `/api/admin/system-health` (or add `/api/health`) to: ping Supabase (e.g. `select 1` or list a table with limit 1), and optionally Stripe (e.g. balance or account) if keys are set. Return 200 only when critical dependencies are reachable; 503 otherwise.
  2. Document deployment steps: env vars, cron schedule and CRON_SECRET, webhook URLs, migrations, and rollback. Add a “Production checklist” (secrets, RLS, storage buckets, cron, Stripe webhook).
  3. Pin Node version (e.g. `engines` in package.json or `.nvmrc`) and document in setup.
- **Acceptance criteria:** Health endpoint reflects DB (and optionally Stripe); deployment and production checklist documented; Node version pinned.

### 5.4 Optional: metrics and tracing

- **Scope:** After 5.1–5.3 if you have a metrics/tracing backend.
- **Tasks:**
  1. Emit simple metrics: e.g. adjudicator runs (counter), claims_created (counter), payout count (counter), cron duration (histogram), external API errors (counter by provider). Use your APM or Prometheus client.
  2. Add tracing for adjudicator and payment flows (e.g. OpenTelemetry) so a single run can be traced from cron to DB and external APIs.
- **Acceptance criteria:** Key business and operational metrics are visible; one sample trace can be inspected end-to-end.

**Phase 5 implementation (5.1–5.3 done; 5.4 metrics/tracing skipped):** Correlation ID: middleware sets `x-request-id` on response; `lib/logger.ts` provides structured JSON logging with `requestId`/`runId` and level (LOG_LEVEL). Adjudicator: each run has a `run_id` (UUID), written to `system_logs` with `run_id`, `duration_ms`, `error`, `payout_failures`, `log_failures`; severity set from result. Admin health shows last run with runId, error, failures; deployment docs include suggested alert rules and rollback. Health: `GET /api/admin/system-health` pings Supabase (and optionally Stripe); returns 503 when DB unreachable. Public `GET /api/health` for load balancers (200/503). Node pinned in `package.json` (`engines.node >= 20`); deployment and development-setup docs updated.

---

## Implementation order (suggested)

1. **Phase 1** in full (1.1 → 1.5). Do 1.1 and 1.2 first (auth and Stripe); then 1.3 and 1.5 (env and Supabase); then 1.4 (adjudicator errors).
2. **Phase 2.1** (split adjudicator) and **Phase 4.1** (tests) in parallel or back-to-back so new modules are covered by tests.
3. **Phase 2.2–2.4** (admin auth, Supabase client, shared utils).
4. **Phase 1** and **Phase 2** unblock **Phase 5.1–5.3** (correlation ID, run outcome, health and docs). Do 5.1–5.3 early if you need to operate production soon.
5. **Phase 4.2–4.5** (validation, PII, encryption, types) as ongoing quality work.
6. **Phase 3** (performance) when you have scaling or latency requirements; 3.1 is highest impact if you run multiple instances.
7. **Phase 5.4** (metrics/tracing) when you have an APM or metrics pipeline.
8. **Phase 2.5** (repository layer) and **Phase 3.2–3.3** as needed for further scalability and maintainability.

---

## Tracking

Use this table to track progress (copy into your issue tracker or docs).

| ID | Phase | Item | Status |
|----|-------|------|--------|
| 1.1 | 1 | Cron/webhook secrets required | ✅ |
| 1.2 | 1 | Stripe webhook idempotency + atomicity | ✅ |
| 1.3 | 1 | Env validation at startup | ✅ |
| 1.4 | 1 | Adjudicator error reporting | ✅ |
| 1.5 | 1 | Supabase client init safe | ✅ |
| 2.1 | 2 | Split adjudicator into modules | ✅ |
| 2.2 | 2 | Standardize admin auth | ✅ |
| 2.3 | 2 | Single Supabase client usage | ✅ |
| 2.4 | 2 | Shared utilities and constants | ✅ |
| 2.5 | 2 | Optional repository layer | ☐ |
| 3.1 | 3 | Distributed rate limit and cache | ✅ |
| 3.2 | 3 | Batch fraud checks | ✅ |
| 3.3 | 3 | Parallelize trigger processing | ✅ |
| 4.1 | 4 | Test suite | ☐ |
| 4.2 | 4 | Input validation (Zod) | ✅ |
| 4.3 | 4 | Reduce PII in logs | ✅ |
| 4.4 | 4 | Fail secure for sensitive storage | ✅ |
| 4.5 | 4 | Align types | ✅ |
| 5.1 | 5 | Correlation IDs and structured logging | ✅ |
| 5.2 | 5 | Adjudicator run outcome and alerts | ✅ |
| 5.3 | 5 | Health checks and deployment docs | ✅ |
| 5.4 | 5 | Optional metrics and tracing | ☐ |

---

*Last updated: March 2025. Adjust estimates and order to match your team size and production timeline.*
