/**
 * POST /api/admin/review-claim
 * Admin approve/reject flagged claim. Body: { claimId, action: "approved" | "rejected" }
 */

import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/utils/admin-guard";
import { reviewClaimSchema } from "@/lib/validations/schemas";
import { parseWithSchema } from "@/lib/validations/parse";

export const dynamic = "force-dynamic";

export const POST = withAdminAuth(async (ctx, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseWithSchema(reviewClaimSchema, body);
  if (!parsed.success) return parsed.response;
  const { claimId, action } = parsed.data;

    const admin = ctx.supabase;
    const updatePayload: Record<string, unknown> = {
      admin_review_status: action,
      reviewed_by: ctx.user.email ?? ctx.user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (action === "approved") {
      updatePayload.is_flagged = false;
    }

    const { error } = await admin
      .from("parametric_claims")
      .update(updatePayload)
      .eq("id", claimId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await admin.from("system_logs").insert({
        event_type: "fraud_review",
        severity: action === "rejected" ? "warning" : "info",
        metadata: {
          claim_id: claimId,
          action,
          reviewed_by: ctx.user.email ?? ctx.user.id,
        },
      });
    } catch (err) {
      console.warn("Audit log insert failed (table may not exist):", err);
    }

    return NextResponse.json({ ok: true, claimId, action });
});
