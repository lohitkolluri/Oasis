import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/config/env";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // If signout fails (e.g., already signed out, network error), continue to redirect.
  }
  const appUrl = getAppUrl();
  return NextResponse.redirect(`${appUrl}/`, { status: 302 });
}
