/**
 * Rate limit store: in-memory (default) or Supabase (shared across instances).
 * Set SUPABASE_RATE_LIMIT_STORE=true to use Supabase for distributed rate limiting.
 *
 * Failure mode: for sensitive keys (`payments:`, `auth:`, `cron:`, `webhook:`) we fail
 * CLOSED on RPC errors to avoid an accidental outage exposing expensive or abusable paths.
 * For informational/UX keys (reads, geo search) we fail OPEN so transient DB blips don't
 * break the dashboard.
 */

import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

export interface RateLimitStore {
  check(key: string, windowMs: number, maxRequests: number): Promise<RateLimitResult>;
}

/** Keys whose failure mode should be "deny" when the rate-limit backing store is unavailable. */
const SENSITIVE_KEY_PREFIXES = [
  'payments:',
  'auth:',
  'cron:',
  'webhook:',
  'admin:demo-trigger',
  'admin:review-claim',
  'claim:',
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PREFIXES.some((p) => key.startsWith(p));
}

const inMemory = new Map<string, { count: number; resetAt: number }>();

function cleanupInMemory(): void {
  const now = Date.now();
  for (const [k, v] of inMemory) {
    if (now > v.resetAt) inMemory.delete(k);
  }
}

/** In-memory store (per instance). */
const inMemoryRateLimitStore: RateLimitStore = {
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
function createSupabaseRateLimitStore(): RateLimitStore {
  const admin = createAdminClient();
  return {
    async check(key, windowMs, maxRequests) {
      const { data, error } = await admin.rpc('rate_limit_check', {
        p_key: key,
        p_window_ms: windowMs,
        p_max_req: maxRequests,
      });
      if (error) {
        const sensitive = isSensitiveKey(key);
        logger.warn('Rate limit store: RPC failed', {
          error: error.message,
          key,
          mode: sensitive ? 'fail-closed' : 'fail-open',
        });
        if (sensitive) {
          return { allowed: false, retryAfterSec: 5 };
        }
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

function shouldUseSupabaseStore(): boolean {
  return ['1', 'true', 'yes'].includes(
    (process.env.SUPABASE_RATE_LIMIT_STORE ?? '').trim().toLowerCase(),
  );
}

/** Default store: in-memory unless Supabase-backed limits are explicitly enabled. */
export function getRateLimitStore(): RateLimitStore {
  if (defaultStore) return defaultStore;
  if (!shouldUseSupabaseStore()) {
    defaultStore = inMemoryRateLimitStore;
    return defaultStore;
  }
  try {
    defaultStore = createSupabaseRateLimitStore();
  } catch {
    defaultStore = inMemoryRateLimitStore;
  }
  return defaultStore;
}
