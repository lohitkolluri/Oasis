import { createClient } from "@/lib/supabase/server";
import { WalletCard } from "@/components/rider/WalletCard";
import { RealtimeWallet } from "@/components/rider/RealtimeWallet";
import { PolicyCard } from "@/components/rider/PolicyCard";
import { ScopeDisclaimer } from "@/components/rider/ScopeDisclaimer";
import { RiskRadar } from "@/components/rider/RiskRadar";
import { PredictiveAlert } from "@/components/rider/PredictiveAlert";
import type { ParametricClaim } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: policies } = await supabase
    .from("weekly_policies")
    .select("*")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .order("week_start_date", { ascending: false })
    .limit(1);

  const policyIds = (policies ?? []).map((p) => p.id);
  let claimsFiltered: ParametricClaim[] = [];
  if (policyIds.length > 0) {
    const { data } = await supabase
      .from("parametric_claims")
      .select("*")
      .in("policy_id", policyIds)
      .order("created_at", { ascending: false })
      .limit(5);
    claimsFiltered = (data ?? []) as ParametricClaim[];
  }

  const totalPayouts =
    claimsFiltered.reduce((sum, c) => sum + Number(c.payout_amount_inr), 0);
  const activePolicy = policies?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">
          Hello, {profile?.full_name || "Partner"}
        </h1>
        <p className="text-zinc-400 text-sm">
          Your income protection at a glance
        </p>
      </div>

      <ScopeDisclaimer />

      <PredictiveAlert />

      {policyIds.length > 0 ? (
        <RealtimeWallet
          profileId={user.id}
          initialBalance={totalPayouts}
          policyIds={policyIds}
          platform={profile?.platform ?? "zepto"}
        />
      ) : (
        <WalletCard
          balance={totalPayouts}
          platform={profile?.platform ?? "zepto"}
          claimCount={claimsFiltered.length}
        />
      )}

      <RiskRadar />

      <PolicyCard
        policy={activePolicy}
        profileId={user.id}
        claims={claimsFiltered}
      />
    </div>
  );
}
