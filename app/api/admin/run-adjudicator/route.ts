import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Executes a manual, on-demand invocation of the core Adjudicator engine.
 * Bypasses automated cron scheduling to forcefully ingest real-time environmental telemetry 
 * (Weather, AQI, localized Traffic) for immediate, admin-authorized claim generation.
 *
 * @returns Serialized JSON payload containing the aggregate metrics of the adjudication run
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
