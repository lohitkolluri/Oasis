/**
 * Shared admin authentication guard for API routes.
 * Eliminates boilerplate isAdmin() checks in every admin endpoint.
 */

import { RATE_LIMITS } from '@/lib/config/constants';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitKey } from '@/lib/utils/api';
import { isAdmin } from '@/lib/utils/auth';
import { NextResponse } from 'next/server';

interface AdminContext {
  user: { id: string; email?: string | null };
  profile: { role?: string | null };
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Wraps an admin API handler with auth + rate-limit checks.
 * Returns 401 if not authenticated, 403 if not admin, 429 if rate limited.
 *
 * Usage:
 *   export const POST = withAdminAuth(async (ctx) => {
 *     // ctx.user, ctx.profile, ctx.supabase available
 *     return NextResponse.json({ ok: true });
 *   });
 */
export function withAdminAuth(
  handler: (ctx: AdminContext, request: Request) => Promise<NextResponse>,
) {
  return async (request: Request) => {
    // Rate limit
    const limitKey = rateLimitKey(request, 'admin');
    const rateLimited = checkRateLimit(limitKey, {
      maxRequests: RATE_LIMITS.ADMIN_PER_MINUTE,
    });
    if (rateLimited) return rateLimited;

    // Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!isAdmin(user, profile)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler({ user, profile: profile ?? {}, supabase }, request);
  };
}
