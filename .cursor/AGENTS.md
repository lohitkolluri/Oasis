## Learned User Preferences

- Use gitmoji-style commits with clear, concise messages
- Avoid em dashes and double-hyphen separators in copy; prefer simple punctuation or `·`
- Dark charcoal theme (`#0f0f0f` bg, `#161616` panels, `#1e1e1e` cards) with neon accents (cyan, violet, emerald)
- Clean, minimal UI inspired by Linear/Vercel/Stripe; avoid generic “vibe-coded” gradients and noisy animations
- Prefer an editorial landing rhythm: paragraph → single focused component → paragraph → component
- Prefer pill-shaped buttons/filters/badges; avoid square tags and boxy segmented controls
- Prefer understated status indicators; avoid flashy “Active/Live” badges
- Prefer high-contrast white primary buttons on dark UI (black text)
- In docs/diagrams, keep labels human-readable; avoid code-path names and overly detailed node text
- No Guidewire/DEVTrails branding anywhere; treat as a personal project
- Mobile UX: top-center toasts, 44–48px minimum touch targets, 16px minimum font on inputs to prevent iOS auto-zoom
- Actionable metrics over vague AI summaries; disable buttons until fully validated; icon buttons over text links

## Learned Workspace Facts

- Stack: Next.js 15 (App Router), TypeScript, Supabase (Auth/DB/Storage/Realtime/pg_cron), Stripe, Tailwind CSS, Framer Motion
- Scope: only loss-of-income from external disruptions (weather, AQI, traffic, curfews); excludes health, life, accidents, vehicle repairs
- Weekly pricing model with three plan tiers (Basic/Standard/Premium); amounts are in `plan_packages` table
- External APIs: Tomorrow.io (weather), WAQI (AQI), Open-Meteo (fallback), NewsData (disruptions), TomTom (traffic), OSRM (routing), Nominatim (geocoding), DiceBear (avatars)
- Docs site: Astro/Starlight in `Docs/` directory (capital D)
- Package manager: `bun` (root has `bun.lock`; docs can be built with `bun` as well)
- Scheduling: adjudicator runs every 15 minutes; weekly premium job runs weekly via one scheduler (GitHub Actions, Supabase `pg_cron`, or Vercel scheduler)
- Government ID: Aadhaar upload + LLM vision verification, AES-256-GCM encrypted storage; India-only (no country code fields)
- Stripe-only payments; Razorpay columns in schema are legacy from migration
