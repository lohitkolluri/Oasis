/**
 * Supabase SSR middleware — refreshes auth tokens on every request.
 *
 * FIXED: Previous implementation set cookies on the request object but never
 * synced them to the outgoing response. Auth token refresh was silently broken.
 * Now follows the official Supabase SSR guide.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Update request cookies (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          // 2. Re-create response to carry the updated request
          supabaseResponse = NextResponse.next({ request });

          // 3. Sync cookies to the outgoing response (CRITICAL FIX)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Record<string, unknown>),
          );
        },
      },
    },
  );

  // Refresh the session — this may call setAll() if tokens are refreshed
  await supabase.auth.getUser();

  return supabaseResponse;
}
