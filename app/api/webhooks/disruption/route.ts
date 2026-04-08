/** Realtime disruption webhook: single trigger payload. Auth via WEBHOOK_SECRET only. */

import { getWebhookSecret } from '@/lib/config/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { processSingleTrigger, type TriggerCandidate } from '@/lib/adjudicator/core';
import { disruptionWebhookSchema } from '@/lib/validations/schemas';
import { parseWithSchema } from '@/lib/validations/parse';
import { NextResponse } from 'next/server';
import { randomUUID, timingSafeEqual } from 'crypto';
import { TRIGGERS } from '@/lib/config/constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function bodyToCandidate(parsed: { type: 'weather' | 'traffic' | 'social'; subtype?: string; severity?: number; lat: number; lng: number; radius_km?: number; raw?: Record<string, unknown> }): TriggerCandidate {
  const severity = Math.min(10, Math.max(0, parsed.severity ?? 7));
  const radiusKm = parsed.radius_km ?? TRIGGERS.DEFAULT_GEOFENCE_RADIUS_KM;
  const raw = parsed.raw ?? { source: 'webhook', subtype: parsed.subtype ?? 'webhook' };
  return {
    type: parsed.type,
    subtype: parsed.subtype ?? 'webhook',
    severity,
    geofence: { type: 'circle', lat: parsed.lat, lng: parsed.lng, radius_km: radiusKm },
    raw: { ...raw, webhook_at: new Date().toISOString() },
  };
}

export async function POST(request: Request) {
  const secret = getWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook not configured. Set WEBHOOK_SECRET for disruption webhook.' },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.headers.get('x-webhook-secret') ?? '';

  // Constant-time comparison to prevent timing attacks.
  const secretBuffer = Buffer.from(secret, 'utf8');
  const bearerBuffer = Buffer.from(bearer, 'utf8');
  const isMatch =
    bearerBuffer.length === secretBuffer.length &&
    timingSafeEqual(bearerBuffer, secretBuffer);
  if (!isMatch) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const parsed = parseWithSchema(disruptionWebhookSchema, body);
  if (!parsed.success) return parsed.response;
  const candidate = bodyToCandidate(parsed.data);

  try {
    const supabase = createAdminClient();
    const result = await processSingleTrigger(supabase, candidate, {
      skipIdempotency: false,
      adjudicatorRunId: randomUUID(),
    });
    return NextResponse.json({
      ok: true,
      eventId: result.eventId,
      claimsCreated: result.claimsCreated,
      payoutsInitiated: result.payoutsInitiated,
    });
  } catch (err) {
    const isConfig = err instanceof Error && err.message?.includes('Missing required env');
    if (isConfig) {
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 },
      );
    }
    const clientMessage =
      process.env.NODE_ENV === 'production'
        ? 'Process trigger failed'
        : err instanceof Error
          ? err.message
          : 'Process trigger failed';
    return NextResponse.json({ error: clientMessage }, { status: 500 });
  }
}
