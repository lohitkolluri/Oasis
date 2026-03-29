import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileCheck, Shield, TrendingUp } from "lucide-react";
import { WalletBalanceCard } from "@/components/rider/WalletBalanceCard";
import { WalletActions } from "@/components/rider/WalletActions";
import { ClaimsPreview } from "@/components/rider/ClaimsPreview";
import { RealtimeProvider } from "@/components/rider/RealtimeProvider";
import { Card } from "@/components/ui/Card";
import {
  deriveWalletStats,
  getRiderPoliciesAndWallet,
} from "@/lib/data/rider";
import { WeeklyEarningsChartLazy } from "@/components/rider/WeeklyEarningsChartLazy";

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
    <RealtimeProvider profileId={user.id} policyIds={result.policyIds}>
      <div className="space-y-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 active:text-zinc-200 transition-colors min-h-[44px] -ml-1 px-1"
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

        <Card
          variant="default"
          padding="none"
          className="rounded-2xl border border-white/10 bg-[#0c0c0c] overflow-hidden"
        >
          <div className="grid grid-cols-3 gap-px bg-white/5">
            <div className="bg-gradient-to-b from-amber-500/10 to-amber-500/5 p-3.5 flex flex-col items-center justify-center text-center min-h-[84px]">
              <div className="flex items-center justify-center gap-1.5 mb-1 w-full">
                <TrendingUp className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider truncate max-w-[12ch]">
                  Earnings
                </span>
              </div>
              <p className="text-lg font-bold tabular-nums text-amber-400">
                ₹{stats.totalPayouts.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-gradient-to-b from-violet-500/10 to-violet-500/5 p-3.5 flex flex-col items-center justify-center text-center min-h-[84px]">
              <div className="flex items-center justify-center gap-1.5 mb-1 w-full">
                <FileCheck className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider truncate max-w-[12ch]">
                  Claims
                </span>
              </div>
              <p className="text-lg font-bold tabular-nums text-violet-400">{stats.totalClaimCount}</p>
            </div>
            <div className={`bg-gradient-to-b ${result.activePolicy ? 'from-uber-green/10 to-uber-green/5' : 'from-zinc-500/10 to-zinc-500/5'} p-3.5 flex flex-col items-center justify-center text-center min-h-[84px]`}>
              <div className="flex items-center justify-center gap-1.5 mb-1 w-full">
                <Shield className={`h-3.5 w-3.5 shrink-0 ${result.activePolicy ? 'text-uber-green' : 'text-zinc-500'}`} />
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider truncate max-w-[12ch]">
                  Coverage
                </span>
              </div>
              <p className={`text-lg font-bold ${result.activePolicy ? 'text-uber-green' : 'text-zinc-500'}`}>{result.activePolicy ? "Active" : "None"}</p>
            </div>
          </div>
        </Card>

        <WalletActions />

        <section>
          <ClaimsPreview claims={result.claims} title="Recent activity" variant="wallet" />
        </section>

        <WeeklyEarningsChartLazy dailyEarnings={stats.weeklyDailyEarnings} />
      </div>
    </RealtimeProvider>
  );
}
