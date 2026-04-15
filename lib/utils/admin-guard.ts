/**
 * Shared admin authentication guard for API routes.
 * Eliminates boilerplate isAdmin() checks in every admin endpoint.
 */

import { RATE_LIMITS } from '@/lib/config/constants';
import { getOrCreateRequestId, logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitKey, sanitizeErrorMessage } from '@/lib/utils/api';
import { isAdmin } from '@/lib/utils/auth';
import { jsonWithRequestId } from '@/lib/utils/request-response';
import { NextResponse } from 'next/server';

interface AdminContext {
  user: { id: string; email?: string | null };
  profile: { role?: string | null };
  supabase: Awaited<ReturnType<typeof createClient>>;
  admin: Awaited<ReturnType<typeof createAdminClient>>;
}

/**
 * Wraps an admin API handler with auth + rate-limit checks.
 * Returns 401 if not authenticated, 403 if not admin, 429 if rate limited.
 * Catches handler errors and returns 500 without leaking details.
 */
export function withAdminAuth(
  handler: (ctx: AdminContext, request: Request) => Promise<NextResponse>,
) {
  return async (request: Request) => {
    const limitKey = rateLimitKey(request, 'admin');
    const rateLimited = await checkRateLimit(limitKey, {
      maxRequests: RATE_LIMITS.ADMIN_PER_MINUTE,
      request,
    });
    if (rateLimited) return rateLimited;

    let supabase: Awaited<ReturnType<typeof createClient>>;
    try {
      supabase = await createClient();
    } catch (err) {
      logger.error('Admin auth: Supabase not configured', {
        requestId: getOrCreateRequestId(request),
        error: err instanceof Error ? err.message : String(err),
      });
      return jsonWithRequestId(request, { error: 'Service unavailable' }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonWithRequestId(request, { error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!isAdmin(user, profile)) {
      return jsonWithRequestId(request, { error: 'Forbidden' }, { status: 403 });
    }

    try {
      const admin = createAdminClient();
      return await handler({ user, profile: profile ?? {}, supabase, admin }, request);
    } catch (err) {
      const requestId = getOrCreateRequestId(request);
      logger.error('Admin handler error', {
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
      return jsonWithRequestId(
        request,
        { error: sanitizeErrorMessage(err, 'Internal server error') },
        { status: 500 },
      );
    }
  };
}
