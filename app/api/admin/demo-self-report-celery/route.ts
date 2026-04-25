/**
 * POST /api/admin/demo-self-report-celery
 *
 * Demo endpoint: shows a Celery enqueue payload for self-report verification.
 * By default the Celery adapter is disabled, so this is "present but not functional"
 * unless OASIS_CELERY_SELF_REPORT_ENABLED=true is set.
 */

import {
  enqueueSelfReportVerificationCelery,
  type SelfReportVerificationCeleryJob,
} from '@/lib/queues/celery-self-report';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BodySchema = z
  .object({
    report_id: z.string().uuid().or(z.string().min(10)),
    profile_id: z.string().uuid().or(z.string().min(10)),
    photo_path: z.string().min(1).nullable().optional(),
    zone_lat: z.number().nullable().optional(),
    zone_lng: z.number().nullable().optional(),
    category: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
  })
  .strict();

export const POST = withAdminAuth(async (_ctx, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const job: SelfReportVerificationCeleryJob = {
    report_id: parsed.data.report_id,
    profile_id: parsed.data.profile_id,
    photo_path: parsed.data.photo_path ?? null,
    zone_lat: parsed.data.zone_lat ?? null,
    zone_lng: parsed.data.zone_lng ?? null,
    category: parsed.data.category ?? null,
    message: parsed.data.message ?? null,
  };

  const result = await enqueueSelfReportVerificationCelery(job);
  return NextResponse.json({
    ok: true,
    demo: true,
    would_send: job,
    enqueue_result: result,
  });
});
