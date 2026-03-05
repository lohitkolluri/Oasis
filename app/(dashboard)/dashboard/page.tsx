import { DashboardContent } from "@/components/rider/DashboardContent";
import { createClient } from "@/lib/supabase/server";
import type { ParametricClaim } from "@/lib/types/database";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, platform, primary_zone_geofence, zone_latitude, zone_longitude, onboarding_complete, role")
    .eq("id", user.id)
    .single();

  const { data: policies } = await supabase
    .from("weekly_policies")
    .select("*, plan_packages(name)")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .order("week_start_date", { ascending: false })
    .limit(1);

  const policyIds = (policies ?? []).map((p) => p.id);
  const activePolicy = policies?.[0] ?? null;

  // Fetch all rider data in parallel
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [claimsRes, walletRes] = await Promise.all([
    policyIds.length > 0
      ? supabase
          .from("parametric_claims")
          .select("*")
          .in("policy_id", policyIds)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    // rider_wallet view gives totals without client-side reduce()
    (async () => {
      try {
        return await supabase
          .from("rider_wallet")
          .select("total_earned_inr, total_claims")
          .eq("rider_id", user.id)
          .single();
      } catch {
        return { data: null };
      }
    })(),
  ]);

  const claimsFiltered = (claimsRes.data ?? []) as ParametricClaim[];

  // Use wallet view totals; fall back to summing recent claims if view unavailable
  const walletData = walletRes.data as
    | { total_earned_inr: number; total_claims: number }
    | null;
  const totalPayouts = walletData
    ? Number(walletData.total_earned_inr)
    : claimsFiltered.reduce((sum, c) => sum + Number(c.payout_amount_inr), 0);
  const totalClaimCount = walletData
    ? Number(walletData.total_claims)
    : claimsFiltered.length;

  // Determine which recent claims still need GPS verification
  let claimIdsNeedingVerification: string[] = [];
  const recentClaimIds = claimsFiltered
    .filter((c) => new Date(c.created_at) >= new Date(dayAgo))
    .map((c) => c.id);
  if (recentClaimIds.length > 0) {
    try {
      const { data: verifications } = await supabase
        .from("claim_verifications")
        .select("claim_id")
        .eq("profile_id", user.id)
        .in("claim_id", recentClaimIds);
      const verifiedIds = new Set((verifications ?? []).map((v) => v.claim_id));
      claimIdsNeedingVerification = recentClaimIds.filter((id) => !verifiedIds.has(id));
    } catch {
      // claim_verifications table may not exist if migrations not yet applied
    }
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const planName = activePolicy?.plan_packages
    ? (activePolicy.plan_packages as { name?: string }).name
    : undefined;

  return (
    <DashboardContent
      user={user}
      profile={profile}
      greeting={greeting}
      policyIds={policyIds}
      totalPayouts={totalPayouts}
      totalClaimCount={totalClaimCount}
      claimsFiltered={claimsFiltered}
      activePolicy={activePolicy}
      planName={planName}
      claimIdsNeedingVerification={claimIdsNeedingVerification}
    />
  );
}
