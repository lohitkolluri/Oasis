import { DashboardContent } from "@/components/rider/DashboardContent";
import { RealtimeProvider } from "@/components/rider/RealtimeProvider";
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
    .select("full_name, platform, primary_zone_geofence, zone_latitude, zone_longitude, role")
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

  return (
    <RealtimeProvider profileId={user.id} policyIds={result.policyIds}>
      <DashboardContent
        user={user}
        profile={profile}
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
    </RealtimeProvider>
  );
}
