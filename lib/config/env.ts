/**
 * Environment validation for required config.
 * Use these getters instead of process.env directly so missing vars fail fast with clear errors.
 */

const isProd = process.env.NODE_ENV === 'production';

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing required env: ${name}. Set it in .env.local or your deployment config.`);
  }
  return trimmed;
}

function optional(name: string, value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

/** Supabase URL and anon key (for browser and SSR). Required for app to run. */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

/** Supabase URL and service role key (server-only). Required for admin and cron. */
export function getSupabaseServiceRoleEnv(): { url: string; serviceRoleKey: string } {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

/**
 * CRON_SECRET for authenticating cron requests.
 * In production, must be set (cron endpoints return 503 if missing).
 * In development, optional for local testing.
 */
export function getCronSecret(): string | null {
  return optional('CRON_SECRET', process.env.CRON_SECRET);
}

/** True if cron auth is required (production). */
export function isCronSecretRequired(): boolean {
  return isProd;
}

/** WEBHOOK_SECRET for disruption webhook. No fallback to CRON_SECRET. */
export function getWebhookSecret(): string | null {
  return optional('WEBHOOK_SECRET', process.env.WEBHOOK_SECRET);
}

/** Stripe webhook secret for checkout.session.completed. */
export function getStripeWebhookSecret(): string | null {
  return optional('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET);
}

/** Stripe secret key for creating Checkout Sessions and payouts (server-only). */
export function getStripeSecretKey(): string {
  return required('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY);
}

/** OpenRouter API key for LLM and vision models (server-only). */
export function getOpenRouterApiKey(): string | null {
  return optional('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY);
}

/** Tomorrow.io API key for weather and forecast data. */
export function getTomorrowApiKey(): string | null {
  return optional('TOMORROW_IO_API_KEY', process.env.TOMORROW_IO_API_KEY);
}

/** TomTom API key for traffic data. */
export function getTomTomApiKey(): string | null {
  return optional('TOMTOM_API_KEY', process.env.TOMTOM_API_KEY);
}

/** Optional encryption keys for KYC media. Must be 32-byte base64 in production. */
export function getFacePhotoEncryptionKey(): string | null {
  return optional('FACE_PHOTO_ENCRYPTION_KEY', process.env.FACE_PHOTO_ENCRYPTION_KEY);
}

export function getGovIdEncryptionKey(): string | null {
  return optional('GOV_ID_ENCRYPTION_KEY', process.env.GOV_ID_ENCRYPTION_KEY);
}

/**
 * Canonical app URL (e.g. for Stripe redirects, emails).
 * In production this is required; in development defaults to http://localhost:3000.
 */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (isProd && !raw) {
    throw new Error(
      'Missing required env: NEXT_PUBLIC_APP_URL. Set it in production for Stripe redirects and links.',
    );
  }
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:3000';
}
