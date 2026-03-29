import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import {
  persistReplayDryRunRows,
  replayDisruptionsAgainstRules,
  type ThresholdOverrides,
} from '@/lib/adjudicator/replay';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/triggers/replay
 * Re-evaluate stored disruption snapshots in a time window against current or hypothetical TRIGGERS.
 * Optional `persistDryRun` appends rows to parametric_trigger_ledger (is_dry_run = true).
 */
export const POST = withAdminAuth(async (_ctx, request: Request) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const from = typeof body.from === 'string' ? body.from : '';
  const to = typeof body.to === 'string' ? body.to : '';
  if (!from || !to) {
    return NextResponse.json(
      { error: 'Required: from and to (ISO 8601 timestamps)' },
      { status: 400 },
    );
  }

  let thresholdOverrides: ThresholdOverrides | undefined;
  if (body.thresholdOverrides != null && typeof body.thresholdOverrides === 'object') {
    thresholdOverrides = body.thresholdOverrides as ThresholdOverrides;
  }

  const ruleVersionLabel =
    typeof body.ruleVersionLabel === 'string' ? body.ruleVersionLabel : undefined;
  const persistDryRun = body.persistDryRun === true;

  const admin = createAdminClient();
  const rows = await replayDisruptionsAgainstRules(admin, {
    fromIso: from,
    toIso: to,
    thresholdOverrides,
    ruleVersionLabel,
  });

  let persisted = 0;
  if (persistDryRun && rows.length > 0) {
    persisted = await persistReplayDryRunRows(admin, rows);
  }

  return NextResponse.json({
    count: rows.length,
    rows,
    persistedDryRunRows: persistDryRun ? persisted : 0,
  });
});
