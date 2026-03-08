/** Platform-wide constants: zones, triggers, fraud thresholds, rate limits, external API config */

/** Default fallback zone (Bangalore) when rider has no coordinates */
export const DEFAULT_ZONE = {
  lat: 12.9716,
  lng: 77.5946,
  name: 'Bangalore',
} as const;

/** Premium pricing bounds (INR) */
export const PREMIUM = {
  BASE: 79,
  MAX: 149,
  RISK_PER_EVENT: 8,
  FORECAST_WEIGHT: 15,
  WEEKS_LOOKBACK: 4,
} as const;

/** Adjudicator trigger thresholds */
export const TRIGGERS = {
  HEAT_THRESHOLD_C: 43,
  HEAT_SUSTAINED_HOURS: 3,
  RAIN_THRESHOLD_MM_H: 4,
  AQI_MIN_THRESHOLD: 150,
  AQI_MAX_THRESHOLD: 400,
  AQI_EXCESS_MULTIPLIER: 1.4,
  LLM_SEVERITY_THRESHOLD: 6,
  DEFAULT_GEOFENCE_RADIUS_KM: 15,
  /** Radius (km) to consider two events the same for duplicate detection. */
  DUPLICATE_EVENT_RADIUS_KM: 30,
  /** In-memory candidate dedupe: same subtype within this radius = duplicate. */
  CANDIDATE_DEDUPE_RADIUS_KM: 30,
  /** News traffic trigger: geofence radius when zone is known (km). */
  NEWS_GEOFENCE_RADIUS_KM: 20,
  /** News curfew trigger: geofence radius when zone is country-wide (km). */
  NEWS_GEOFENCE_RADIUS_KM_COUNTRY: 50,
} as const;

/** Fraud detection thresholds */
export const FRAUD = {
  RAPID_CLAIMS_WINDOW_HOURS: 24,
  RAPID_CLAIMS_THRESHOLD: 5,
  CLUSTER_ANOMALY_WINDOW_MIN: 10,
  CLUSTER_ANOMALY_MIN_CLAIMS: 10,
  DEVICE_FINGERPRINT_WINDOW_HOURS: 1,
  DEVICE_FINGERPRINT_MIN_DISTANCE_DEG: 0.5,
  HISTORICAL_BASELINE_MULTIPLIER: 3,
  VERIFY_WINDOW_HOURS: 24,
} as const;

/** Rate limiting (requests per window) */
export const RATE_LIMITS = {
  PAYMENTS_PER_MINUTE: 10,
  AUTH_PER_MINUTE: 20,
  CRON_PER_HOUR: 5,
  ADMIN_PER_MINUTE: 30,
  DEFAULT_PER_MINUTE: 60,
} as const;

/** Adjudicator: max triggers processed in parallel (reduces run time when many candidates). */
export const ADJUDICATOR = {
  TRIGGER_CONCURRENCY: 3,
} as const;

/** External API config */
export const EXTERNAL_APIS = {
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 1000,
  RETRY_MAX_DELAY_MS: 10000,
  CACHE_WEATHER_TTL_MS: 30 * 60 * 1000, // 30 min
  CACHE_AQI_TTL_MS: 60 * 60 * 1000,     // 1 hour
  CACHE_NEWS_TTL_MS: 15 * 60 * 1000,     // 15 min
} as const;
