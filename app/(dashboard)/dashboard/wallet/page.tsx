import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WalletBalanceCard } from "@/components/rider/WalletBalanceCard";
import { WalletActions } from "@/components/rider/WalletActions";
import { WeeklyEarningsChart } from "@/components/rider/WeeklyEarningsChart";
import { ClaimsPreview } from "@/components/rider/ClaimsPreview";
import {
  deriveWalletStats,
  getRiderPoliciesAndWallet,
} from "@/lib/data/rider";

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, result] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    getRiderPoliciesAndWallet(supabase, user.id, {
      includeClaims: true,
      includeClaimVerificationIds: false,
      includeRisk: false,
    }),
  ]);

  const stats = deriveWalletStats(result);
  const firstName = profile?.full_name?.split(/\s+/)[0] ?? "there";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Hello, {firstName}!
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Your payout balance and recent activity
        </p>
      </div>

      {/* Main wallet card — gradient, rounded, prominent balance */}
      <WalletBalanceCard
        initialBalance={stats.totalPayouts}
        weeklyChange={stats.thisWeekEarned}
        policyIds={result.policyIds}
        sparklineData={
          stats.weeklyDailyEarnings.some((n) => n > 0)
            ? stats.weeklyDailyEarnings
            : undefined
        }
      />

      {/* Quick actions — Report, Claims, Policy, More */}
      <WalletActions />

      {/* Recent activity — list style with View all */}
      <section>
        <ClaimsPreview claims={result.claims} title="Recent activity" variant="wallet" />
      </section>

      <WeeklyEarningsChart dailyEarnings={stats.weeklyDailyEarnings} />
    </div>
  );
}
