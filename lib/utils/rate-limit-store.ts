/**
 * Rate limit store: in-memory (single instance) or Supabase (shared across instances).
 * When SUPABASE_SERVICE_ROLE_KEY is set, uses Supabase for distributed rate limiting.
 * On RPC failure we fail open (allow request) and log a warning.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

export interface RateLimitStore {
  check(
    key: string,
    windowMs: number,
    maxRequests: number,
  ): Promise<RateLimitResult>;
}

const inMemory = new Map<
  string,
  { count: number; resetAt: number }
>();

function cleanupInMemory(): void {
  const now = Date.now();
  for (const [k, v] of inMemory) {
    if (now > v.resetAt) inMemory.delete(k);
  }
}

/** In-memory store (per instance). */
export const inMemoryRateLimitStore: RateLimitStore = {
  async check(key, windowMs, maxRequests) {
    cleanupInMemory();
    const now = Date.now();
    let entry = inMemory.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      inMemory.set(key, entry);
    } else {
      entry.count++;
    }
    if (entry.count > maxRequests) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
      };
    }
    return { allowed: true };
  },
};

/** Supabase-backed store (shared across instances). */
export function createSupabaseRateLimitStore(): RateLimitStore {
  const admin = createAdminClient();
  return {
    async check(key, windowMs, maxRequests) {
      const { data, error } = await admin.rpc('rate_limit_check', {
        p_key: key,
        p_window_ms: windowMs,
        p_max_req: maxRequests,
      });
      if (error) {
        logger.warn('Rate limit store: RPC failed, allowing request (fail-open)', {
          error: error.message,
        });
        return { allowed: true };
      }
      const result = data as { allowed?: boolean; retry_after_sec?: number };
      return {
        allowed: result.allowed !== false,
        retryAfterSec: result.retry_after_sec,
      };
    },
  };
}

let defaultStore: RateLimitStore | null = null;

/** Default store: Supabase if admin client available, else in-memory. */
export function getRateLimitStore(): RateLimitStore {
  if (defaultStore) return defaultStore;
  try {
    defaultStore = createSupabaseRateLimitStore();
  } catch {
    defaultStore = inMemoryRateLimitStore;
  }
  return defaultStore;
}
