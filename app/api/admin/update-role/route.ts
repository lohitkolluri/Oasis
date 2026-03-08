import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAdminAuth } from "@/lib/utils/admin-guard";
import { updateRoleSchema } from "@/lib/validations/schemas";
import { parseWithSchema } from "@/lib/validations/parse";

/** Admin-only: set a user's role (rider | admin). */
export const POST = withAdminAuth(async (_ctx, request) => {
  const body = await request.json();
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

    return NextResponse.json({ ok: true });
});
