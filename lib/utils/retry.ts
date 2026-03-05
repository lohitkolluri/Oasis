/**
 * Fetch with exponential backoff retry and optional caching.
 * Used for external API calls (Tomorrow.io, WAQI, NewsData, OpenRouter).
 */

import { EXTERNAL_APIS } from '@/lib/config/constants';

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** If set, responses are cached in memory for this many ms */
  cacheTtlMs?: number;
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Periodically clean expired cache entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now > entry.expiresAt) cache.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * Fetch with automatic retry on failure/5xx and optional response caching.
 * Returns the parsed JSON response or throws after all retries are exhausted.
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? EXTERNAL_APIS.RETRY_MAX_ATTEMPTS;
  const baseDelay = options?.baseDelayMs ?? EXTERNAL_APIS.RETRY_BASE_DELAY_MS;
  const maxDelay = options?.maxDelayMs ?? EXTERNAL_APIS.RETRY_MAX_DELAY_MS;
  const cacheTtl = options?.cacheTtlMs;

  // Check cache first
  const cacheKey = `${init?.method ?? 'GET'}:${url}`;
  if (cacheTtl) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);

      // Don't retry client errors (4xx) except 429 (rate limited)
      if (!res.ok && res.status !== 429 && res.status < 500) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      // Retry on 5xx and 429 (rate limited)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as T;

      // Cache successful response
      if (cacheTtl) {
        cache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtl });
      }

      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500,
          maxDelay,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error(`fetchWithRetry failed after ${maxAttempts} attempts`);
}

/** Clear all cached API responses (useful for testing) */
export function clearApiCache(): void {
  cache.clear();
}
