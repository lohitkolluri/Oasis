/**
 * Environment validation for required config.
 * Use these getters instead of process.env directly so missing vars fail fast with clear errors.
 */

const isProd = process.env.NODE_ENV === 'production';

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `Missing required env: ${name}. Set it in .env.local or your deployment config.`,
    );
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

const RAZORPAY_TEST_KEY_PREFIX = 'rzp_test_';

function assertRazorpayTestKeyId(keyId: string): void {
  if (process.env.NODE_ENV === 'production') return;
  if (!keyId.startsWith(RAZORPAY_TEST_KEY_PREFIX)) {
    throw new Error(
      'Only Razorpay test keys are allowed: set NEXT_PUBLIC_RAZORPAY_KEY_ID to a value starting with rzp_test_ (Dashboard → Test mode).',
    );
  }
}

/** Razorpay Key Id (test mode only; safe to expose in the browser). */
export function getRazorpayKeyId(): string {
  const key = required('NEXT_PUBLIC_RAZORPAY_KEY_ID', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  assertRazorpayTestKeyId(key);
  return key;
}

/** Razorpay Key Secret (server-only). */
export function getRazorpayKeySecret(): string {
  return required('RAZORPAY_KEY_SECRET', process.env.RAZORPAY_KEY_SECRET);
}

/** Razorpay webhook signing secret (server-only). */
export function getRazorpayWebhookSecret(): string | null {
  return optional('RAZORPAY_WEBHOOK_SECRET', process.env.RAZORPAY_WEBHOOK_SECRET);
}

/** OpenRouter API key for LLM and vision models (server-only). */
export function getOpenRouterApiKey(): string | null {
  return optional('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY);
}

/**
 * Lightweight text model for pricing forecast aggregation/explanations (server-only).
 * Keep this cheap: it is called from admin analytics, not customer-critical paths.
 */
export function getPricingForecastModel(): string {
  const raw = process.env.PRICING_FORECAST_MODEL?.trim();
  return raw || 'meta-llama/llama-3.1-8b-instruct';
}

/**
 * Vision model for KYC (Gov ID + face) verification.
 * Defaults to a free-tier model if not configured.
 */
export function getKycVisionModel(): string {
  const raw = process.env.KYC_VISION_MODEL?.trim();
  return raw || 'google/gemma-4-26b-a4b-it';
}

/**
 * Vision model for rider self-reports (report-delivery).
 * Defaults to a free-tier model if not configured.
 */
export function getSelfReportVisionModel(): string {
  const raw = process.env.SELF_REPORT_VISION_MODEL?.trim();
  return raw || 'google/gemma-4-26b-a4b-it';
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
 * Canonical app URL (e.g. for redirects, emails).
 * In production this is required; in development defaults to http://localhost:3000.
 */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (isProd && !raw) {
    throw new Error(
      'Missing required env: NEXT_PUBLIC_APP_URL. Set it in production for redirects and links.',
    );
  }
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:3000';
}

/** VAPID public key (safe in browser). Optional — without it, Web Push opt-in is disabled. */
export function getVapidPublicKey(): string | null {
  // Support both canonical and legacy names so existing deployments don't silently
  // look "unconfigured" in the UI.
  return (
    optional('NEXT_PUBLIC_VAPID_PUBLIC_KEY', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) ??
    optional('VAPID_PUBLIC_KEY', process.env.VAPID_PUBLIC_KEY)
  );
}

/** VAPID private key (server-only). */
export function getVapidPrivateKey(): string | null {
  return optional('VAPID_PRIVATE_KEY', process.env.VAPID_PRIVATE_KEY);
}

/**
 * VAPID subject (mailto: or https: URL). Identifies the sender to push services.
 */
export function getVapidSubject(): string {
  return optional('VAPID_SUBJECT', process.env.VAPID_SUBJECT) || 'mailto:lohitkolluri@gmail.com';
}
