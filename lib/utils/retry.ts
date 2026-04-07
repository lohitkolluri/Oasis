/** Fetch with exponential backoff and optional in-memory cache for external APIs */

import { EXTERNAL_APIS } from '@/lib/config/constants';

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  cacheTtlMs?: number;
  /** Per-attempt fetch timeout (aborts slow hung requests). */
  timeoutMs?: number;
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const asSeconds = Number(header);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }
  const asDate = Date.parse(header);
  if (Number.isNaN(asDate)) return null;
  return Math.max(0, asDate - Date.now());
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
      const timeoutMs = options?.timeoutMs;
      let fetchInit = init;
      if (timeoutMs != null && timeoutMs > 0) {
        const t = AbortSignal.timeout(timeoutMs);
        fetchInit =
          init?.signal != null
            ? { ...init, signal: AbortSignal.any([init.signal, t]) }
            : { ...init, signal: t };
      }

      const res = await fetch(url, fetchInit);

      if (res.status === 429) {
        if (attempt >= maxAttempts) {
          throw new Error(`HTTP 429: ${res.statusText}`);
        }
        const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
        const delay = Math.min(
          Math.max(retryAfterMs ?? 0, baseDelay * Math.pow(2, attempt - 1)),
          maxDelay,
        );
        await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * 250));
        continue;
      }

      if (!res.ok && res.status < 500) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

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

/** Fetch text (RSS/XML/etc.) with the same retry semantics as `fetchWithRetry`. */
export async function fetchTextWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<string> {
  const maxAttempts = options?.maxAttempts ?? EXTERNAL_APIS.RETRY_MAX_ATTEMPTS;
  const baseDelay = options?.baseDelayMs ?? EXTERNAL_APIS.RETRY_BASE_DELAY_MS;
  const maxDelay = options?.maxDelayMs ?? EXTERNAL_APIS.RETRY_MAX_DELAY_MS;
  const cacheTtl = options?.cacheTtlMs;
  const cacheKey = `TEXT:${init?.method ?? 'GET'}:${url}`;

  if (cacheTtl) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as string;
    }
  }

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const timeoutMs = options?.timeoutMs;
      let fetchInit = init;
      if (timeoutMs != null && timeoutMs > 0) {
        const t = AbortSignal.timeout(timeoutMs);
        fetchInit =
          init?.signal != null
            ? { ...init, signal: AbortSignal.any([init.signal, t]) }
            : { ...init, signal: t };
      }

      const res = await fetch(url, fetchInit);

      if (res.status === 429) {
        if (attempt >= maxAttempts) {
          throw new Error(`HTTP 429: ${res.statusText}`);
        }
        const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
        const delay = Math.min(
          Math.max(retryAfterMs ?? 0, baseDelay * Math.pow(2, attempt - 1)),
          maxDelay,
        );
        await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * 250));
        continue;
      }

      if (!res.ok && res.status < 500) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.text();
      if (cacheTtl) cache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtl });
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

  throw lastError ?? new Error(`fetchTextWithRetry failed after ${maxAttempts} attempts`);
}

export function clearApiCache(): void {
  cache.clear();
}
