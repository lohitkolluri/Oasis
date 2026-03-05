import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";

/** Admin-only: set a user's role (rider | admin). Requires admin auth. */
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
  const { profileId, role } = body as { profileId?: string; role?: string };

  if (!profileId || !role) {
    return NextResponse.json(
      { error: "profileId and role (rider | admin) required" },
      { status: 400 }
    );
  }

  if (role !== "rider" && role !== "admin") {
    return NextResponse.json(
      { error: "role must be rider or admin" },
      { status: 400 }
    );
  }

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
}
