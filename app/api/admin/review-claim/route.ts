/**
 * POST /api/admin/review-claim
 *
 * Allows admin to approve or reject a flagged claim.
 * Approved claims have their flag cleared; rejected claims remain flagged.
 *
 * Body: { claimId: string, action: "approved" | "rejected" }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length > 0 && !adminEmails.includes((user.email ?? "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { claimId, action } = body;

  if (typeof claimId !== "string" || !claimId) {
    return NextResponse.json({ error: "claimId is required" }, { status: 400 });
  }

  if (action !== "approved" && action !== "rejected") {
    return NextResponse.json(
      { error: "action must be 'approved' or 'rejected'" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const updatePayload: Record<string, unknown> = {
    admin_review_status: action,
    reviewed_by: user.email ?? user.id,
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

  // Log the review action
  try {
    await admin.from("system_logs").insert({
      event_type: "fraud_review",
      severity: action === "rejected" ? "warning" : "info",
      metadata: {
        claim_id: claimId,
        action,
        reviewed_by: user.email ?? user.id,
      },
    });
  } catch {
    // Log table may not exist yet
  }

  return NextResponse.json({ ok: true, claimId, action });
}
