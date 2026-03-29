import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAdminAuth } from "@/lib/utils/admin-guard";
import { updatePolicySchema } from "@/lib/validations/schemas";
import { parseWithSchema } from "@/lib/validations/parse";
import { insertAdminAuditLog } from "@/lib/admin/audit-log";
import { AUDIT } from "@/lib/admin/audit-actions";

/** Admin-only: update policy (deactivate, change plan). */
export const POST = withAdminAuth(async (ctx, request) => {
  const body = await request.json();
  const parsed = parseWithSchema(updatePolicySchema, body);
  if (!parsed.success) return parsed.response;
  const { policyId, isActive, planId } = parsed.data;

    const admin = createAdminClient();

    const { data: before } = await admin
      .from("weekly_policies")
      .select("is_active, plan_id, weekly_premium_inr")
      .eq("id", policyId)
      .maybeSingle();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof isActive === "boolean") {
      updates.is_active = isActive;
    }

    if (planId) {
      const { data: plan } = await admin
        .from("plan_packages")
        .select("id, weekly_premium_inr")
        .eq("id", planId)
        .single();

      if (!plan) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }
      updates.plan_id = planId;
      updates.weekly_premium_inr = plan.weekly_premium_inr;
    }

    const { error } = await admin
      .from("weekly_policies")
      .update(updates)
      .eq("id", policyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await insertAdminAuditLog(admin, {
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: AUDIT.POLICY_UPDATE,
      resourceType: "weekly_policies",
      resourceId: policyId,
      metadata: {
        before: before ?? null,
        patch: { isActive, planId },
      },
    });

    return NextResponse.json({ ok: true });
});
