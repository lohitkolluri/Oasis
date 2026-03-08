import { DashboardContent } from "@/components/rider/DashboardContent";
import { createClient } from "@/lib/supabase/server";
import {
  deriveWalletStats,
  getRiderPoliciesAndWallet,
} from "@/lib/data/rider";
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

  const result = await getRiderPoliciesAndWallet(supabase, user.id, {
    includeClaims: true,
    includeClaimVerificationIds: true,
    includeRisk: true,
  });

  const stats = deriveWalletStats(result);
  const riskLevel =
    result.riskSeverity >= 7
      ? ("high" as const)
      : result.riskSeverity >= 4
        ? ("medium" as const)
        : ("low" as const);

  const planName = result.activePolicy?.plan_packages
    ? (result.activePolicy.plan_packages as { name?: string }).name
    : undefined;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <DashboardContent
      user={user}
      profile={profile}
      greeting={greeting}
      policyIds={result.policyIds}
      totalPayouts={stats.totalPayouts}
      totalClaimCount={stats.totalClaimCount}
      thisWeekEarned={stats.thisWeekEarned}
      weeklyDailyEarnings={stats.weeklyDailyEarnings}
      riskLevel={riskLevel}
      claimsFiltered={result.claims}
      activePolicy={result.activePolicy}
      planName={planName}
      claimIdsNeedingVerification={result.claimIdsNeedingVerification}
    />
  );
}
