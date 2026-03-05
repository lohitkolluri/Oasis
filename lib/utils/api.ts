/**
 * Shared API utilities: error handling, rate limiting, response helpers.
 */

import { RATE_LIMITS } from '@/lib/config/constants';
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

export function errorResponse(error: unknown, fallbackMessage = 'Internal server error') {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }
  console.error('[API Error]', error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: 500 },
  );
}

// ── In-memory rate limiter ──────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetAt) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Check rate limit for a given key. Returns null if allowed, or a NextResponse 429 if exceeded.
 */
export function checkRateLimit(
  key: string,
  options?: Partial<RateLimitOptions>,
): NextResponse | null {
  const maxRequests = options?.maxRequests ?? RATE_LIMITS.DEFAULT_PER_MINUTE;
  const windowMs = options?.windowMs ?? 60_000;
  const now = Date.now();

  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  return null;
}

/**
 * Extract a rate-limit key from request (IP or user-based).
 */
export function rateLimitKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return `${prefix}:${ip}`;
}
