/**
 * Supabase SSR middleware — refreshes auth tokens on every request.
 * Adds correlation ID (x-request-id) on response. Returns 503 if env is missing.
 */
import { getSupabasePublicEnv } from '@/lib/config/env';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export async function updateSession(request: NextRequest) {
  const requestId =
    request.headers.get('x-request-id') ?? crypto.randomUUID();

  let supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set('x-request-id', requestId);

  try {
    const { url, anonKey } = getSupabasePublicEnv();

    const supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options as Record<string, unknown>),
            );
          },
        },
      },
    );

    await supabase.auth.getUser();

    return supabaseResponse;
  } catch (err) {
    logger.error('Middleware: Supabase env or auth failed', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 },
    );
  }
}
