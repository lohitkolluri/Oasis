# Changelog

All notable changes to **Oasis** are recorded here. The product is a weekly parametric loss-of-income protection experience for India quick-commerce delivery partners (external disruptions only: no health, life, accident, or vehicle-repair coverage).

This file follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Release lines are tied to `package.json` until Git tags exist.

## Scope and accuracy

- **Source of truth:** Default-branch commit history (`git log`), newest first below.
- **Commit count:** 88 commits from `633478d` through `1871a88`.
- **Date span:** 2026-03-04 through 2026-03-30 (dates shown use Git’s **`%ad`** with `--date=short`, i.e. **author date** in `YYYY-MM-DD`).
- **Subject lines:** Reproduced **verbatim** from `git log --pretty=%s` to avoid editorial drift. Emoji and `:shortcode:` tokens are preserved as authored.
- **Known ambiguity:** `31a7178` has no textual subject beyond a single emoji in Git; it is listed exactly as stored. Two different commits use “initial commit” wording (`633478d` on 2026-03-04 and `7e7a6cf` on 2026-03-14); both are retained as separate events in history.
- **Merge commits:** Three pull-request merges appear as authored merge commits (`094014f`, `7a243a5`, `1871a88`).

## [Unreleased]

- **Documentation:** README overhaul—hero and CTAs, nested table of contents, themed Mermaid architecture diagram, Phase 1/2 demo video links, accurate project layout, expanded rider/admin walkthroughs, env and Makefile references.
- **Tooling:** Makefile defaults to Bun, `docs` target uses `docs/`, adds `test` / `test-e2e`, keeps `configure` and full `setup` flow.

## [0.1.0] — 2026-03-30

Version label matches `package.json` (`0.1.0`). No Git tag was present when this log was assembled; treat this section as the cumulative history for that marketing/version line.

### Commit history (complete, newest first)

- **2026-03-30** (`1871a88`) Merge pull request #3 from lohitkolluri/Origin
- **2026-03-30** (`df04338`) ✨ Admin reserves cohorts, plans forecast job, and premium cron alignment
- **2026-03-29** (`4e793e5`) :sparkles: feat: versioned parametric rules, governance console, and admin audit trail
- **2026-03-29** (`0aa2512`) ✨ Add parametric trigger ledger, ingestion health, trust console, and NewsData.io client
- **2026-03-29** (`1efca5e`) ✨ rider profile, loading & admin polish
- **2026-03-29** (`7b7201e`) 🎨 Polish dashboard + IST coverage dates
- **2026-03-28** (`7a243a5`) Merge pull request #2 from lohitkolluri/Origin
- **2026-03-28** (`0e71b02`) ✨ Dynamic premiums, renewals, and rider UI polish
- **2026-03-28** (`7bbc0f5`) 💄 Polish marketing copy and policy-facing text
- **2026-03-22** (`09be84c`) 📚 Razorpay demo payments docs + README
- **2026-03-22** (`094014f`) Merge pull request #1 from lohitkolluri/dev
- **2026-03-22** (`d4ae8b9`) 🎨 Landing polish, admin fraud, Stripe migration & docs
- **2026-03-22** (`31a7178`) ✨
- **2026-03-22** (`91ca90b`) 📝 docs: UPI in Stripe Checkout
- **2026-03-22** (`467f51d`) 🙈 Untrack .cursor
- **2026-03-22** (`f684b8f`) 🐛 Stripe payment types
- **2026-03-22** (`f4c5d96`) 📝 README Stripe UPI
- **2026-03-22** (`2a7eba8`) 💳 Stripe UPI
- **2026-03-21** (`c286a08`) 📝 update demo login docs and learning index
- **2026-03-21** (`4f2d250`) ✅ add unit tests and cleanup
- **2026-03-21** (`55b7eb4`) 📝 cite README claims with grounded sources
- **2026-03-20** (`c5d6dc4`) 📝 enhance README UI and update llms.txt
- **2026-03-20** (`8a323c6`) ✅ Expand unit and E2E test coverage
- **2026-03-20** (`9baba68`) ✅ Add sample unit and E2E testing setup
- **2026-03-20** (`a582e38`) 📝 docs: update premium engine documentation
- **2026-03-20** (`411e8f4`) ✨ feat: dynamic actuarial premium engine
- **2026-03-20** (`4923b27`) 📝 docs: update schemas, sync structure & ui fixes
- **2026-03-20** (`ee7c17b`) 💄 polish landing ui
- **2026-03-19** (`696d11b`) 📝 docs: sync dev setup and tooling
- **2026-03-19** (`321431b`) 📝 docs: refine README for phase one
- **2026-03-19** (`5fa656b`) 🛠️ fix: align pricing forecast and polish onboarding
- **2026-03-18** (`76fb152`) ✨ feat: add weekly plan pricing timeline and forecast
- **2026-03-18** (`d539f72`) 💄 polish: rider directory filters and pagination
- **2026-03-18** (`e521576`) ⚡️ perf: optimize rider bundles and signup redirects
- **2026-03-18** (`10e2fd1`) 🛠️ fix: improve onboarding KYC and demo data
- **2026-03-17** (`77cd0a5`) 💄 polish: center KPI tiles and rename earnings
- **2026-03-17** (`4703386`) 🛠️ fix: auth redirects, landing polish, and PWA prompts
- **2026-03-17** (`2ef43c1`) 💄 polish UI consistency + admin UX
- **2026-03-14** (`9e195bc`) Rider dashboard & claims: dedupe recent claims, shadcn Card, tabular claims list
- **2026-03-14** (`728ad36`) Admin dashboard: shadcn UI, tree nav, rider detail, gov ID decrypt, copyable IDs
- **2026-03-14** (`7e7a6cf`) feat: initial commit
- **2026-03-14** (`151ab51`) 💄 rider toasts: react-toastify, opaque, z-index above modals; fix OpenRouter header ByteString
- **2026-03-14** (`84f8725`) 💄 improve toast for mobile (safe area, width, hide timestamp)
- **2026-03-14** (`fae2290`) 🛠️ fix: harden openrouter client attribution
- **2026-03-14** (`d0fe648`) 🧹 chore: tighten deps and openrouter client
- **2026-03-13** (`21dae14`) chore: update continual learning state
- **2026-03-13** (`3ce78b1`) 📬 feat: queue self-report verification via pgmq
- **2026-03-13** (`59be986`) 🧠 fix: clarify self-report AI errors
- **2026-03-13** (`3647e65`) 🩺 fix: improve identity verification UX
- **2026-03-13** (`82cce39`) ✨ feat: centralize claims engine and adjudicator core
- **2026-03-13** (`d2169a8`) ✨ refactor: simplify admin dashboard for productivity
- **2026-03-13** (`51623d0`) 💰 feat: stripe payments admin reconciliation view
- **2026-03-13** (`97c7850`) ✨ feat: realtime payouts, admin live feed, and log rotation
- **2026-03-13** (`0e4128c`) 📝 docs: simplify and polish Oasis docs
- **2026-03-12** (`b5f2f28`) 🛡️ feat: stricter self-report AI and plan-aligned fraud caps
- **2026-03-12** (`879fc13`) 🩹 fix: stale payout fallbacks, hardcoded coords, greedy LLM regex, silent catch blocks
- **2026-03-12** (`c7d46d7`) 🐛 fix: report delivery falls back to corroboration when LLM is unavailable
- **2026-03-12** (`04db5e2`) ✨ feat: parametric insurance system overhaul + comprehensive docs sync
- **2026-03-11** (`9bd612c`) 📝 docs: fix mermaid intro diagram and bun lock
- **2026-03-11** (`7ac921c`) 🐛 fix: disable d2 integration on vercel builds
- **2026-03-11** (`c53e36c`) 📝 docs: migrate diagrams to mermaid
- **2026-03-09** (`84406b2`) ✨ fix claim verification and payout status consistency
- **2026-03-09** (`fcebae4`) ✨ fix PWA app icon contrast on iOS
- **2026-03-09** (`eb935e3`) 🔒 fix payout auth and align verification-first claims flow
- **2026-03-09** (`a091791`) ✨ feat: harden admin operations insights and rider disruption review
- **2026-03-09** (`2fe1e5a`) :bug: fix PWA session persistence and logout on close
- **2026-03-09** (`c2b22ef`) ✨ feat: auto location verify on claim + UI polish
- **2026-03-09** (`c35a158`) 🔒 Security: no payouts without location verification
- **2026-03-08** (`c798480`) 🔒 security: upgrade Next.js to 15.0.7 (CVE-2025-66478 patch)
- **2026-03-08** (`c797fba`) 🐛 fix: build — exclude Docs from tsconfig, GeofenceCircle type, Suspense for useSearchParams
- **2026-03-08** (`15b2a50`) 🐛 fix: brace mismatch in create-checkout baseUrl try/catch
- **2026-03-08** (`51bdc9a`) ✨ feat: rider app improvements, permissions & report delivery
- **2026-03-06** (`d6aca2d`) :memo: docs: revamp documentation UX with interactive OpenAPI, D2 graphs, and premium UI
- **2026-03-06** (`05755ce`) docs: add Root Directory tip for Next.js detection error
- **2026-03-06** (`4c7da8d`) fix: add docs vercel.json, document Root Directory for Next.js detection
- **2026-03-06** (`dd4859c`) docs: update deployment for Vercel Hobby cron limits
- **2026-03-06** (`bccf343`) docs: migrate to Astro Starlight, fix titles, add flowcharts and icons
- **2026-03-06** (`8fac74e`) 📝 docs: update README and Docusaurus for onboarding, face verification, Stripe
- **2026-03-06** (`b626bb3`) feat: Stripe Checkout, face verification, onboarding flow
- **2026-03-05** (`4fae6b4`) ✨ Add role-based admin access, payment tracking, and UI revamp
- **2026-03-04** (`c47569b`) ✨ Admin analytics, AQI engine, docs, and system health
- **2026-03-04** (`4a0f037`) Implement missing requirements: traffic trigger, geofence payout, fraud checks, predictive analytics
- **2026-03-04** (`0b0336b`) Replace Ambee with Open-Meteo AQI, admin run adjudicator, payment demo mode, docs update
- **2026-03-04** (`adad992`) 💄 OASIS auth background, rider app design polish, Card component
- **2026-03-04** (`03479f3`) ✨ PWA support, Button component, policy docs, DiceBear avatars, admin nav
- **2026-03-04** (`1d2fd81`) 🎉 Oasis parametric insurance platform - full implementation
- **2026-03-04** (`3f8310c`) 📝 Add Cursorrules and Hackathon Docs
- **2026-03-04** (`633478d`) Initial commit

### Maintenance

To refresh this list from Git (newest first, same shape):

```bash
git log --pretty=format:'- **%ad** (`%h`) %s' --date=short
```

Repository: [github.com/lohitkolluri/Oasis](https://github.com/lohitkolluri/Oasis).
