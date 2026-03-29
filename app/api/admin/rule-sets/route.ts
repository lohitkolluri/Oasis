import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { createRuleSetSchema } from '@/lib/validations/schemas';
import { parseWithSchema } from '@/lib/validations/parse';
import { mergeTriggersPartial } from '@/lib/parametric-rules/resolve';
import { parsePayoutLadder } from '@/lib/parametric-rules/payout-ladder';
import { insertAdminAuditLog } from '@/lib/admin/audit-log';
import { AUDIT } from '@/lib/admin/audit-actions';

export const dynamic = 'force-dynamic';

/** List all rule sets (newest effective_from first). */
export const GET = withAdminAuth(async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('parametric_rule_sets')
    .select(
      'id,created_at,version_label,effective_from,effective_until,triggers,payout_ladder,excluded_subtypes,notes,created_by',
    )
    .order('effective_from', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rule_sets: data ?? [] });
});

/**
 * Create a new current rule set: closes the open row (effective_until = new effective_from), inserts new row.
 * Triggers JSON stores the full merged threshold snapshot for legal replay.
 */
export const POST = withAdminAuth(async (ctx, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseWithSchema(createRuleSetSchema, body);
  if (!parsed.success) return parsed.response;

  const {
    versionLabel,
    effectiveFrom,
    triggers: triggersPartial,
    payoutLadder,
    excludedSubtypes,
    notes,
  } = parsed.data;

  const effectiveIso = effectiveFrom ?? new Date().toISOString();
  const admin = createAdminClient();

  const mergedTriggers = mergeTriggersPartial(triggersPartial ?? {});
  const ladder = parsePayoutLadder(payoutLadder ?? null);

  const { error: closeErr } = await admin
    .from('parametric_rule_sets')
    .update({ effective_until: effectiveIso })
    .is('effective_until', null);

  if (closeErr) {
    return NextResponse.json({ error: closeErr.message }, { status: 500 });
  }

  const { data: row, error: insErr } = await admin
    .from('parametric_rule_sets')
    .insert({
      version_label: versionLabel,
      effective_from: effectiveIso,
      effective_until: null,
      triggers: mergedTriggers as unknown as Record<string, number>,
      payout_ladder: ladder,
      excluded_subtypes: excludedSubtypes ?? [],
      notes: notes ?? null,
      created_by: ctx.user.id,
    })
    .select('id,version_label,effective_from')
    .single();

  if (insErr || !row) {
    return NextResponse.json({ error: insErr?.message ?? 'Insert failed' }, { status: 500 });
  }

  await insertAdminAuditLog(admin, {
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: AUDIT.RULE_SET_CREATE,
    resourceType: 'parametric_rule_sets',
    resourceId: row.id,
    metadata: {
      version_label: versionLabel,
      effective_from: effectiveIso,
      excluded_subtypes: excludedSubtypes ?? [],
    },
  });

  return NextResponse.json({ ok: true, rule_set: row });
});
