/**
 * Shared API utilities: error handling, rate limiting, response helpers.
 * Rate limiting uses a store (in-memory or Supabase) for single- or multi-instance use.
 */

import { RATE_LIMITS } from '@/lib/config/constants';
import { getRateLimitStore } from '@/lib/utils/rate-limit-store';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

// ── Standardized API error ──────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Human-readable detail for logs and non-production API responses.
 * Razorpay and other SDKs often reject with plain objects, not Error instances.
 */
export function formatErrorDetail(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    try {
      return JSON.stringify(err);
    } catch {
      return '[Unserializable error]';
    }
  }
  return String(err);
}

/** In production returns genericMessage; in dev returns a readable message or JSON for object errors. */
export function sanitizeErrorMessage(err: unknown, genericMessage: string): string {
  if (process.env.NODE_ENV === 'production') return genericMessage;
  return formatErrorDetail(err);
}

export function errorResponse(
  error: unknown,
  fallbackMessage = 'Internal server error',
  meta?: { requestId?: string | null },
) {
  if (error instanceof ApiError) {
    const safeMessage =
      process.env.NODE_ENV === 'production' && error.statusCode >= 500
        ? fallbackMessage
        : error.message;
    return NextResponse.json(
      { error: safeMessage, code: error.code },
      { status: error.statusCode },
    );
  }
  logger.error('API error', {
    ...meta,
    error: formatErrorDetail(error),
  });
  const clientMessage = sanitizeErrorMessage(error, fallbackMessage);
  return NextResponse.json({ error: clientMessage }, { status: 500 });
}

// ── Rate limiter (async; uses in-memory or Supabase store) ───────────────────

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Check rate limit for a given key. Returns null if allowed, or a NextResponse 429 if exceeded.
 * Uses Supabase store when configured so limits are shared across instances.
 */
export async function checkRateLimit(
  key: string,
  options?: Partial<RateLimitOptions>,
): Promise<NextResponse | null> {
  const maxRequests = options?.maxRequests ?? RATE_LIMITS.DEFAULT_PER_MINUTE;
  const windowMs = options?.windowMs ?? 60_000;

  const store = getRateLimitStore();
  const result = await store.check(key, windowMs, maxRequests);

  if (result.allowed) return null;

  const retryAfter = result.retryAfterSec ?? 60;
  return NextResponse.json(
    { error: 'Too many requests', retryAfter },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    },
  );
}

/**
 * Extract a rate-limit key from request (IP or user-based).
 */
export function rateLimitKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return `${prefix}:${ip}`;
}
