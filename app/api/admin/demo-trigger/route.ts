/**
 * POST /api/admin/demo-trigger
 * Injects a synthetic disruption and runs the adjudicator. Admin-only.
 * Body: { eventSubtype, lat, lng, radiusKm?, severity? }
 */

import { NextResponse } from "next/server";
import { runAdjudicator } from "@/lib/adjudicator/run";
import type { DemoTriggerOptions } from "@/lib/adjudicator/run";
import { withAdminAuth } from "@/lib/utils/admin-guard";
import { sanitizeErrorMessage } from "@/lib/utils/api";
import { demoTriggerSchema } from "@/lib/validations/schemas";
import { parseWithSchema } from "@/lib/validations/parse";
import { getOrCreateRequestId, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = withAdminAuth(async (_ctx, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseWithSchema(demoTriggerSchema, body);
  if (!parsed.success) return parsed.response;
  const { eventSubtype, lat, lng, radiusKm, severity, riderId } = parsed.data;

  const demoOptions: DemoTriggerOptions = {
    eventSubtype,
    lat,
    lng,
    radiusKm: radiusKm ?? 15,
    severity: severity ?? 8,
    ...(riderId && { riderId }),
  };

  try {
    const result = await runAdjudicator(demoOptions);
    return NextResponse.json({ ok: true, demo: true, ...result });
  } catch (err) {
    logger.error("Demo trigger failed", {
      requestId: getOrCreateRequestId(request),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: sanitizeErrorMessage(err, "Demo trigger failed") },
      { status: 500 },
    );
  }
});
