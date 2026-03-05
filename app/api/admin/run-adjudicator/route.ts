import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/run-adjudicator — Run adjudicator on demand (same as cron).
 * Uses real weather, AQI, news APIs. Admin-only.
 */
export const POST = withAdminAuth(async () => {
  // Dynamic import to avoid circular deps
  const { runAdjudicator } = await import('@/lib/adjudicator/run');
  try {
    const result = await runAdjudicator();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Adjudicator failed' },
      { status: 503 },
    );
  }
});
