import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAdminAuth } from "@/lib/utils/admin-guard";
import { updateRoleSchema } from "@/lib/validations/schemas";
import { parseWithSchema } from "@/lib/validations/parse";
import { insertAdminAuditLog } from "@/lib/admin/audit-log";
import { AUDIT } from "@/lib/admin/audit-actions";

/** Admin-only: set a user's role (rider | admin). */
export const POST = withAdminAuth(async (ctx, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseWithSchema(updateRoleSchema, body);
  if (!parsed.success) return parsed.response;
  const { profileId, role } = parsed.data;

    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", profileId);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to update role" },
        { status: 500 }
      );
    }

    await insertAdminAuditLog(admin, {
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: AUDIT.ROLE_UPDATE,
      resourceType: "profiles",
      resourceId: profileId,
      metadata: { role },
    });

    return NextResponse.json({ ok: true });
});
