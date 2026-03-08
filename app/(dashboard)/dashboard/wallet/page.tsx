import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WalletBalanceCard } from "@/components/rider/WalletBalanceCard";
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

  const result = await getRiderPoliciesAndWallet(supabase, user.id, {
    includeClaims: true,
    includeClaimVerificationIds: false,
    includeRisk: false,
  });

  const stats = deriveWalletStats(result);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-500 hover:text-uber-green transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

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

      <WeeklyEarningsChart dailyEarnings={stats.weeklyDailyEarnings} />

      <ClaimsPreview claims={result.claims} />
    </div>
  );
}
