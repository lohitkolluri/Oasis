/** Fetch with exponential backoff and optional in-memory cache for external APIs */

import { EXTERNAL_APIS } from '@/lib/config/constants';

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  cacheTtlMs?: number;
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now > entry.expiresAt) cache.delete(key);
    }
  }, 5 * 60 * 1000);
}

/** GET/POST with retry (exponential backoff), optional cache. Throws after max attempts. */
export async function fetchWithRetry<T = unknown>(
  url: string,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? EXTERNAL_APIS.RETRY_MAX_ATTEMPTS;
  const baseDelay = options?.baseDelayMs ?? EXTERNAL_APIS.RETRY_BASE_DELAY_MS;
  const maxDelay = options?.maxDelayMs ?? EXTERNAL_APIS.RETRY_MAX_DELAY_MS;
  const cacheTtl = options?.cacheTtlMs;
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

      if (!res.ok && res.status !== 429 && res.status < 500) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as T;

      if (cacheTtl) {
        cache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtl });
      }

      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
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

export function clearApiCache(): void {
  cache.clear();
}
