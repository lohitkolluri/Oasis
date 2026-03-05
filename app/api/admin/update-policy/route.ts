import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";

/** Admin-only: update policy (deactivate, change plan). Requires admin auth. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdmin(user, profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { policyId, isActive, planId } = body as {
    policyId?: string;
    isActive?: boolean;
    planId?: string;
  };

  if (!policyId) {
    return NextResponse.json({ error: "policyId required" }, { status: 400 });
  }

  const admin = createAdminClient();

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

  return NextResponse.json({ ok: true });
}
