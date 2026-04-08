import { AUDIT } from '@/lib/admin/audit-actions';
import { insertAdminAuditLog } from '@/lib/admin/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { parseWithSchema } from '@/lib/validations/parse';
import { updatePolicySchema } from '@/lib/validations/schemas';
import { NextResponse } from 'next/server';

/** Admin-only: update policy (deactivate, change plan). */
export const POST = withAdminAuth(async (ctx, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseWithSchema(updatePolicySchema, body);
  if (!parsed.success) return parsed.response;
  const { policyId, isActive, planId } = parsed.data;

  const admin = createAdminClient();

  const { data: before } = await admin
    .from('weekly_policies')
    .select('is_active, plan_id, weekly_premium_inr, profile_id')
    .eq('id', policyId)
    .maybeSingle();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof isActive === 'boolean') {
    updates.is_active = isActive;
  }

  // When activating a week, keep one active row per rider (same as subscription / one-off RPC).
  if (isActive === true && before?.profile_id) {
    await admin
      .from('weekly_policies')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('profile_id', before.profile_id)
      .neq('id', policyId)
      .eq('is_active', true);
  }

  if (planId) {
    const { data: plan } = await admin
      .from('plan_packages')
      .select('id, weekly_premium_inr')
      .eq('id', planId)
      .single();

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    updates.plan_id = planId;
    updates.weekly_premium_inr = plan.weekly_premium_inr;
  }

  const { error } = await admin.from('weekly_policies').update(updates).eq('id', policyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await insertAdminAuditLog(admin, {
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: AUDIT.POLICY_UPDATE,
    resourceType: 'weekly_policies',
    resourceId: policyId,
    metadata: {
      before: before ?? null,
      patch: { isActive, planId },
    },
  });

  return NextResponse.json({ ok: true });
});
