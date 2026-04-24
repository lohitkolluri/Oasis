/**
 * Shared API utilities: error handling, rate limiting, response helpers.
 * Rate limiting uses a store (in-memory or Supabase) for single- or multi-instance use.
 */

import { RATE_LIMITS } from '@/lib/config/constants';
import { getOrCreateRequestId, logger } from '@/lib/logger';
import { getRateLimitStore } from '@/lib/utils/rate-limit-store';
import { jsonWithRequestId } from '@/lib/utils/request-response';
import { NextResponse } from 'next/server';

// ── Standardized API error ──────────────────────────────────────────────────

class ApiError extends Error {
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
function formatErrorDetail(err: unknown): string {
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
  meta?: { requestId?: string | null; request?: Request },
) {
  const request = meta?.request;
  const requestId = request ? getOrCreateRequestId(request) : (meta?.requestId ?? null);

  if (error instanceof ApiError) {
    const safeMessage =
      process.env.NODE_ENV === 'production' && error.statusCode >= 500
        ? fallbackMessage
        : error.message;
    const payload: Record<string, unknown> = {
      error: safeMessage,
      ...(error.code ? { code: error.code } : {}),
    };
    if (request) {
      return jsonWithRequestId(request, payload, { status: error.statusCode });
    }
    if (requestId) payload.requestId = requestId;
    const headers = new Headers();
    if (requestId) headers.set('x-request-id', requestId);
    return NextResponse.json(payload, { status: error.statusCode, headers });
  }
  logger.error('API error', {
    requestId: requestId ?? undefined,
    error: formatErrorDetail(error),
  });
  const clientMessage = sanitizeErrorMessage(error, fallbackMessage);
  if (request) {
    return jsonWithRequestId(request, { error: clientMessage }, { status: 500 });
  }
  return NextResponse.json(
    { error: clientMessage, ...(requestId ? { requestId } : {}) },
    { status: 500, headers: requestId ? { 'x-request-id': requestId } : undefined },
  );
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
  options?: Partial<RateLimitOptions> & { request?: Request },
): Promise<NextResponse | null> {
  const maxRequests = options?.maxRequests ?? RATE_LIMITS.DEFAULT_PER_MINUTE;
  const windowMs = options?.windowMs ?? 60_000;

  const store = getRateLimitStore();
  const result = await store.check(key, windowMs, maxRequests);

  if (result.allowed) return null;

  const retryAfter = result.retryAfterSec ?? 60;
  const waitUnit = retryAfter === 1 ? 'second' : 'seconds';
  const waitMessage = `Please wait ${retryAfter} ${waitUnit} before trying again.`;
  const request = options?.request;
  const requestId = request ? getOrCreateRequestId(request) : null;
  const headers = new Headers({ 'Retry-After': String(retryAfter) });
  if (requestId) headers.set('x-request-id', requestId);
  return NextResponse.json(
    {
      error: waitMessage,
      retryAfter,
      ...(requestId ? { requestId } : {}),
    },
    { status: 429, headers },
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
