/**
 * Correlation IDs for API responses: mirrors middleware `x-request-id` and embeds
 * `requestId` in JSON so clients and support can reference a single run.
 */
import { getOrCreateRequestId } from '@/lib/logger';
import { NextResponse } from 'next/server';

export function jsonWithRequestId<T extends Record<string, unknown>>(
  request: Request,
  body: T,
  init?: ResponseInit,
): NextResponse {
  const requestId = getOrCreateRequestId(request);
  const merged = { ...body, requestId } as T & { requestId: string };
  const headers = new Headers(init?.headers);
  headers.set('x-request-id', requestId);
  return NextResponse.json(merged, { ...init, headers });
}
