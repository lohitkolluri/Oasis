import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleEnv } from "@/lib/config/env";

export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleEnv();
  return createClient(url, serviceRoleKey);
}
