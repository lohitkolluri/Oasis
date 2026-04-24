/**
 * POST /api/admin/demo-trigger
 * Injects a synthetic disruption and runs the adjudicator. Admin-only.
 * Body: { eventSubtype, lat, lng, radiusKm?, severity? }
 */

import type { DemoTriggerOptions } from '@/lib/adjudicator/run';
import { runAdjudicator } from '@/lib/adjudicator/run';
import { getOrCreateRequestId, logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { sanitizeErrorMessage } from '@/lib/utils/api';
import { parseWithSchema } from '@/lib/validations/parse';
import { demoTriggerSchema } from '@/lib/validations/schemas';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withAdminAuth(async (_ctx, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseWithSchema(demoTriggerSchema, body);
  if (!parsed.success) return parsed.response;
  const { eventSubtype, lat, lng, radiusKm, severity, riderId, runLabel } = parsed.data;

  let resolvedLat = lat;
  let resolvedLng = lng;
  if (riderId) {
    const admin = createAdminClient();
    const { data: rider, error } = await admin
      .from('profiles')
      .select('zone_latitude, zone_longitude')
      .eq('id', riderId)
      .single();

    if (error || rider?.zone_latitude == null || rider?.zone_longitude == null) {
      return NextResponse.json(
        { error: 'Selected rider has no delivery zone coordinates configured.' },
        { status: 400 },
      );
    }
    resolvedLat = Number(rider.zone_latitude);
    resolvedLng = Number(rider.zone_longitude);
  }

  if (resolvedLat == null || resolvedLng == null) {
    return NextResponse.json(
      { error: 'Location coordinates are required for non-rider-scoped demos.' },
      { status: 400 },
    );
  }

  const demoOptions: DemoTriggerOptions = {
    eventSubtype,
    lat: resolvedLat,
    lng: resolvedLng,
    radiusKm: radiusKm ?? 15,
    severity: severity ?? 8,
    ...(riderId && { riderId }),
  };

  try {
    const result = runLabel
      ? await runAdjudicator({
          demoTrigger: demoOptions,
          demoLogExtras: { demo_run_label: runLabel },
        })
      : await runAdjudicator(demoOptions);
    return NextResponse.json({ ok: true, demo: true, ...result });
  } catch (err) {
    logger.error('Demo trigger failed', {
      requestId: getOrCreateRequestId(request),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: sanitizeErrorMessage(err, 'Demo trigger failed') },
      { status: 500 },
    );
  }
});
