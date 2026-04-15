# Changelog

Notable changes to **Oasis** are documented in this file.

Oasis is weekly parametric **loss-of-income** protection for India quick-commerce delivery partners (external disruptions only: not health, life, accident, or vehicle repair).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Version numbers match `package.json` until release tags are published.

---

## [1.0.0] - 2026-04-15

Phase 3 release — **Scale & Optimise**.

### Added

- **Advanced fraud detection:** 11-layer pipeline including GPS spoofing detection (accuracy + impossible travel), device attestation (mock location, developer settings, rooted device, Play Integrity, OS signature), IMU teleportation heuristic, GNSS SNR variance check, historical baseline comparison, cross-profile velocity, cluster anomaly, and payout destination anomaly.
- **Instant payout system:** Simulated UPI payouts with mock gateway, processing delay, and reference generation. Razorpay one-time and subscription payment verification flows.
- **Intelligent dashboards:** Rider view with earnings protected, active weekly coverage status, wallet sparkline, predictive risk alerts, and AI-generated insights. Admin view with loss ratios, trigger breakdowns, reserves cohort analysis, plan financials, and 7-day predictive outlook.
- **Predictive analytics:** Next-week risk forecasting combining weather API forecasts with historical claim baselines for proactive alerting.
- **Production hardening:** CI workflow (lint + typecheck + vitest), unit tests for fraud detector and payout ladder, error boundaries (global, admin, 404), rate limiting on 6 authenticated routes, RLS privilege restriction on admin RPCs, CSP tightening, query bounds on all unbounded selects, Supabase client memoization, bundle optimization, SEO/OpenGraph metadata, accessibility improvements, and edge function auth fix.

### Changed

- README: structure, hero, nested TOC, architecture Mermaid diagram, demo video links, project layout, rider/admin walkthroughs, env and Makefile tables.
- Makefile: Bun-first targets, `docs/` path, `test` and `test-e2e` targets, `configure` / `setup` flow.
- Docs URL unified to `oasis-docs.vercel.app` across landing page and Astro config.
- `framer-motion` added to `optimizePackageImports` for smaller bundles.

### Security

- Revoked `authenticated` role access to `admin_window_metrics` and `admin_plan_financials` RPCs (privilege escalation fix).
- Added rate limiting to rider insight, claims verification, payment verification, subscription verification, rider profile, and platform status endpoints.
- Removed `unsafe-eval` from Content-Security-Policy `script-src`.
- Enterprise adjudicator edge function now authenticates with `CRON_SECRET` Bearer token and restricts CORS origin.

### Fixed

- BottomNav missing `aria-label` and `aria-current` attributes.
- Landing page docs link pointed to wrong hostname.
- Unbounded database queries in next-week-risk, platform status, and reserves cohorts.
- Supabase client recreated on every render in login/register forms.

---

## [0.1.0] - 2026-03-30

First consolidated snapshot for the `0.1.0` line in `package.json` (initial development through late March 2026).

### Added

- Rider experience: PWA-oriented app, onboarding, zone selection, KYC (government ID and face verification), weekly plans, dashboard, claims, wallet, profile.
- Admin experience: rider and policy management, analytics, payments, fraud review, triggers and ingestion health, governance and versioned parametric rules, financial and reserves views, system health and demo tooling.
- Parametric engine: scheduled adjudication, multi-source signals (weather, AQI, news via NewsData.io, optional traffic), geofencing, append-only trigger ledger.
- Pricing: dynamic weekly premium engine, renewal-oriented flows, and cron alignment for weekly billing windows.
- Backend: Next.js App Router API routes, Supabase (Postgres, Auth, Realtime, Storage), middleware session handling.
- Documentation: Astro Starlight docs site, deployment guides, OpenAPI-oriented API documentation.
- Quality: Vitest unit tests and Playwright E2E harness.

### Changed

- Landing, policy copy, and rider/admin UI iterated across multiple passes (dashboard polish, IST-aligned coverage display, marketing text).

### Fixed

- Build and type issues (e.g. TS config boundaries, Suspense/useSearchParams, geofence typings, checkout URL handling).
- Claim and payout consistency, PWA session persistence, OpenRouter client hardening, onboarding and demo data fixes.

### Security

- Next.js upgraded to address CVE-2025-66478 (see advisory for your installed line).
- Stricter payout and location-verification posture in hardened flows.

<details>
<summary><strong>Archive: commit log (2026-03-04 to 2026-03-30)</strong></summary>

Same short hashes and dates as `git log`; descriptions are rewritten for consistent, professional wording (no emojis). Use `git show <hash>` for the exact original message and diff.

- **2026-03-30** (`1871a88`) Merge pull request #3 from lohitkolluri/Origin
- **2026-03-30** (`df04338`) Add admin reserves cohorts, plan pricing forecast job, and weekly premium cron alignment
- **2026-03-29** (`4e793e5`) Add versioned parametric rules, governance console, and admin audit trail
- **2026-03-29** (`0aa2512`) Add parametric trigger ledger, ingestion health UI, trust console, and NewsData.io client
- **2026-03-29** (`1efca5e`) Add rider profile route, loading states, and admin polish
- **2026-03-29** (`7b7201e`) Polish dashboard and show IST-aligned coverage dates
- **2026-03-28** (`7a243a5`) Merge pull request #2 from lohitkolluri/Origin
- **2026-03-28** (`0e71b02`) Add dynamic premiums and renewals; polish rider UI
- **2026-03-28** (`7bbc0f5`) Polish marketing and policy-facing copy
- **2026-03-22** (`09be84c`) Document Razorpay demo payments and update README
- **2026-03-22** (`094014f`) Merge pull request #1 from lohitkolluri/dev
- **2026-03-22** (`d4ae8b9`) Polish landing and admin fraud surfaces; migrate payments toward Stripe; update docs
- **2026-03-22** (`31a7178`) Minor change (original commit message was empty aside from decoration)
- **2026-03-22** (`91ca90b`) Document UPI support in Stripe Checkout
- **2026-03-22** (`f684b8f`) Fix Stripe payment type configuration
- **2026-03-22** (`f4c5d96`) Update README for Stripe UPI
- **2026-03-22** (`2a7eba8`) Enable Stripe UPI payments
- **2026-03-21** (`c286a08`) Update demo login documentation and learning index
- **2026-03-21** (`4f2d250`) Add unit tests and related cleanup
- **2026-03-21** (`55b7eb4`) Add sourced citations for README claims
- **2026-03-20** (`c5d6dc4`) Improve README presentation and update `llms.txt`
- **2026-03-20** (`8a323c6`) Expand unit and end-to-end test coverage
- **2026-03-20** (`9baba68`) Add baseline unit and end-to-end test setup
- **2026-03-20** (`a582e38`) Update premium engine documentation
- **2026-03-20** (`411e8f4`) Add dynamic actuarial premium engine
- **2026-03-20** (`4923b27`) Update schemas, sync structure documentation, and apply UI fixes
- **2026-03-20** (`ee7c17b`) Polish landing page UI
- **2026-03-19** (`696d11b`) Sync development setup and tooling documentation
- **2026-03-19** (`321431b`) Refine README for phase one
- **2026-03-19** (`5fa656b`) Align pricing forecast behavior and polish onboarding
- **2026-03-18** (`76fb152`) Add weekly plan pricing timeline and forecast UI
- **2026-03-18** (`d539f72`) Polish rider directory filters and pagination
- **2026-03-18** (`e521576`) Improve performance of rider bundles and signup redirects
- **2026-03-18** (`10e2fd1`) Improve onboarding KYC and demo data
- **2026-03-17** (`77cd0a5`) Center KPI tiles and rename earnings labels
- **2026-03-17** (`4703386`) Fix auth redirects; polish landing and PWA install prompts
- **2026-03-17** (`2ef43c1`) Improve UI consistency and admin experience
- **2026-03-14** (`9e195bc`) Rider dashboard and claims: deduplicate recent claims, adopt shadcn Card, tabular claims list
- **2026-03-14** (`728ad36`) Admin dashboard: shadcn UI, tree navigation, rider detail, government ID decryption, copyable identifiers
- **2026-03-14** (`7e7a6cf`) Initial application commit
- **2026-03-14** (`151ab51`) Rider toasts: react-toastify styling, stacking, and OpenRouter header ByteString fix
- **2026-03-14** (`84f8725`) Improve toast layout on mobile (safe area, width, hide timestamp)
- **2026-03-14** (`fae2290`) Harden OpenRouter client attribution headers
- **2026-03-14** (`d0fe648`) Tighten dependencies and OpenRouter client configuration
- **2026-03-13** (`21dae14`) Update continual learning state (agent metadata)
- **2026-03-13** (`3ce78b1`) Queue self-report verification using PGMQ
- **2026-03-13** (`59be986`) Clarify self-report AI error handling
- **2026-03-13** (`3647e65`) Improve identity verification user experience
- **2026-03-13** (`82cce39`) Centralize claims engine and adjudicator core
- **2026-03-13** (`d2169a8`) Refactor admin dashboard for faster workflows
- **2026-03-13** (`51623d0`) Add Stripe payments admin reconciliation view
- **2026-03-13** (`97c7850`) Add realtime payouts, admin live feed, and log rotation
- **2026-03-13** (`0e4128c`) Simplify and polish Oasis documentation
- **2026-03-12** (`b5f2f28`) Tighten self-report AI validation and plan-aligned fraud caps
- **2026-03-12** (`879fc13`) Fix stale payout fallbacks, hardcoded coordinates, greedy LLM regex, and silent catch blocks
- **2026-03-12** (`c7d46d7`) Fall back to corroboration when report-delivery LLM is unavailable
- **2026-03-12** (`04db5e2`) Parametric insurance system overhaul and documentation sync
- **2026-03-11** (`9bd612c`) Fix Mermaid intro diagram and Bun lockfile documentation
- **2026-03-11** (`7ac921c`) Disable D2 integration on Vercel builds
- **2026-03-11** (`c53e36c`) Migrate diagrams from D2 to Mermaid
- **2026-03-09** (`84406b2`) Fix claim verification and payout status consistency
- **2026-03-09** (`fcebae4`) Fix PWA app icon contrast on iOS
- **2026-03-09** (`eb935e3`) Fix payout authorization and align verification-first claims flow
- **2026-03-09** (`a091791`) Harden admin operations insights and rider disruption review
- **2026-03-09** (`2fe1e5a`) Fix PWA session persistence and logout-on-close behavior
- **2026-03-09** (`c2b22ef`) Add automatic location verification on claim and related UI polish
- **2026-03-09** (`c35a158`) Security: block payouts without location verification
- **2026-03-08** (`c798480`) Security: upgrade Next.js to 15.0.7 (CVE-2025-66478)
- **2026-03-08** (`c797fba`) Fix build: exclude Docs from TypeScript config, GeofenceCircle typing, Suspense for useSearchParams
- **2026-03-08** (`15b2a50`) Fix brace mismatch in create-checkout base URL try/catch
- **2026-03-08** (`51bdc9a`) Rider app improvements, permissions, and delivery report flow
- **2026-03-06** (`d6aca2d`) Documentation UX: interactive OpenAPI, D2 graphs, and layout refresh
- **2026-03-06** (`05755ce`) Document Vercel root directory tip for Next.js detection
- **2026-03-06** (`4c7da8d`) Add docs `vercel.json` and document root directory for Next.js
- **2026-03-06** (`dd4859c`) Update deployment docs for Vercel Hobby cron limits
- **2026-03-06** (`bccf343`) Migrate documentation to Astro Starlight; fix titles; add flowcharts and icons
- **2026-03-06** (`8fac74e`) Update README and Docusaurus for onboarding, face verification, and Stripe
- **2026-03-06** (`b626bb3`) Add Stripe Checkout, face verification, and onboarding flow
- **2026-03-05** (`4fae6b4`) Add role-based admin access, payment tracking, and UI revamp
- **2026-03-04** (`c47569b`) Add admin analytics, AQI engine, documentation, and system health
- **2026-03-04** (`4a0f037`) Add traffic trigger, geofence payout, fraud checks, and predictive analytics
- **2026-03-04** (`0b0336b`) Replace Ambee with Open-Meteo AQI; add admin adjudicator trigger; payment demo mode; docs
- **2026-03-04** (`adad992`) Polish auth background, rider app design, and Card component
- **2026-03-04** (`03479f3`) Add PWA support, Button component, policy docs, DiceBear avatars, and admin navigation
- **2026-03-04** (`1d2fd81`) Oasis parametric insurance platform: full initial implementation
- **2026-03-04** (`3f8310c`) Add Cursor rules and hackathon documentation
- **2026-03-04** (`633478d`) Repository initial commit

</details>

---

## Maintainer notes

Regenerate a one-line log (newest first):

```bash
git log --pretty=format:'- **%ad** (`%h`) %s' --date=short
```

**Repository:** [github.com/lohitkolluri/Oasis](https://github.com/lohitkolluri/Oasis)
