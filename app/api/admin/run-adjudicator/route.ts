import { withAdminAuth } from '@/lib/utils/admin-guard';
import { jsonWithRequestId } from '@/lib/utils/request-response';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Executes a manual, on-demand invocation of the core Adjudicator engine.
 * Bypasses automated cron scheduling to forcefully ingest real-time environmental telemetry
 * (Weather, AQI, localized Traffic) for immediate, admin-authorized claim generation.
 *
 * @returns Serialized JSON payload containing the aggregate metrics of the adjudication run
 */
export const POST = withAdminAuth(async (_ctx, request) => {
  // Dynamic import to avoid circular deps
  const { runAdjudicator } = await import('@/lib/adjudicator/run');
  try {
    const result = await runAdjudicator();
    return jsonWithRequestId(request, result as unknown as Record<string, unknown>);
  } catch (err) {
    return jsonWithRequestId(
      request,
      { error: err instanceof Error ? err.message : 'Adjudicator failed' },
      { status: 503 },
    );
  }
});
