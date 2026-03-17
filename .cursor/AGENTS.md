## Learned User Preferences

- Use gitmoji-style commits with clear, concise messages
- Avoid em dashes and double-hyphen separators in copy; prefer simple punctuation or `·`
- Dark charcoal theme (`#0f0f0f` bg, `#161616` panels, `#1e1e1e` cards) with neon accents (cyan, violet, emerald)
- Clean, minimal UI inspired by Linear/Vercel/Stripe; avoid generic “vibe-coded” gradients and noisy animations
- Prefer an editorial landing rhythm: paragraph → single focused component → paragraph → component
- Prefer understated status indicators; avoid flashy “Active/Live” badges
- Use Framer Motion for subtle reveal + parallax effects; keep motion clean and non-distracting
- Use Supabase MCP plugin for database migrations and operations when available
- No Guidewire/DEVTrails branding anywhere; treat as a personal project
- Glass card panel style: `backdrop-blur`, `rounded-2xl`, soft shadow (`shadow-[0_0_20px_rgba(255,255,255,0.03)]`)
- Mobile UX: top-center toasts, 44–48px minimum touch targets, 16px minimum font on inputs to prevent iOS auto-zoom
- Actionable metrics over vague AI summaries; disable buttons until fully validated; icon buttons over text links

## Learned Workspace Facts

- Stack: Next.js 15 (App Router), TypeScript, Supabase (Auth/DB/Storage/Realtime/pg_cron), Stripe, Tailwind CSS, Framer Motion
- Scope: only loss-of-income from external disruptions (weather, AQI, traffic, curfews); excludes health, life, accidents, vehicle repairs
- Weekly pricing model with three plan tiers (Basic/Standard/Premium); amounts are in `plan_packages` table
- External APIs: Tomorrow.io (weather), WAQI (AQI), Open-Meteo (fallback), NewsData (disruptions), TomTom (traffic), OSRM (routing), Nominatim (geocoding), DiceBear (avatars)
- LLM: OpenRouter `meta-llama/llama-3.1-8b-instruct:free` for text; Gemini Flash for government ID vision verification
- Docs site: Astro/Starlight in `Docs/` directory (capital D); uses `bun` as package manager there, `npm` in root
- Deployment: Vercel at `oasis-murex-omega.vercel.app`, region `bom1` (Mumbai), standalone output
- Adjudicator runs every 15 minutes via triple-redundant triggers (GitHub Actions + pg_cron + Vercel Cron)
- Fonts: Inter (body `--font-sans`), Geist (display `--font-display`), JetBrains Mono (mono `--font-mono`)
- Government ID: Aadhaar upload + LLM vision verification, AES-256-GCM encrypted storage; India-only (no country code fields)
- Stripe-only payments; Razorpay columns in schema are legacy from migration
- Supabase project ref: `qlrzndxpoxzeykikibro`; all RLS policies use `(select auth.uid())` initplan optimization
