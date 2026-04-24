/**
 * Supabase SSR middleware — refreshes auth tokens only when a session cookie exists.
 * Adds correlation ID (x-request-id) on response. Returns 503 if env is missing.
 */
import { getSupabasePublicEnv } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { hasSupabaseAuthCookie } from '@/lib/supabase/auth-cookies';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  const supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set('x-request-id', requestId);

  if (!hasSupabaseAuthCookie(request.cookies)) {
    return supabaseResponse;
  }

  try {
    const { url, anonKey } = getSupabasePublicEnv();

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Record<string, unknown>),
          );
        },
      },
    });

    await supabase.auth.getUser();

    return supabaseResponse;
  } catch (err) {
    logger.error('Middleware: Supabase env or auth failed', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
