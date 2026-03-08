/**
 * GET /api/health
 * Public liveness/readiness for load balancers and orchestrators.
 * Returns 200 when Supabase is reachable, 503 otherwise. No auth.
 * Never leaks env or internal errors; message is generic in production.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const genericUnhealthy = 'Unavailable';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('system_logs').select('id').limit(1).maybeSingle();
    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: process.env.NODE_ENV === 'production' ? genericUnhealthy : error.message,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', error: genericUnhealthy },
      { status: 503 },
    );
  }
}
