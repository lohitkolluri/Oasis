import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RunAdjudicatorButton } from "@/components/admin/RunAdjudicatorButton";
import { getNextWeekPrediction } from "@/lib/ml/next-week-risk";
import { Cloud, ShieldAlert, TrendingUp } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const { data: policies } = await supabase
    .from("weekly_policies")
    .select("weekly_premium_inr, is_active")
    .eq("is_active", true);

  const { data: claims } = await supabase
    .from("parametric_claims")
    .select("payout_amount_inr, is_flagged");

  const totalPremiums =
    policies?.reduce((sum, p) => sum + Number(p.weekly_premium_inr), 0) ?? 0;
  const totalPayouts =
    claims?.reduce((sum, c) => sum + Number(c.payout_amount_inr), 0) ?? 0;
  const flaggedCount = claims?.filter((c) => c.is_flagged).length ?? 0;

  const lossRatio =
    totalPremiums > 0 ? ((totalPayouts / totalPremiums) * 100).toFixed(1) : "0";

  const nextWeekPrediction = await getNextWeekPrediction(supabase);
  const riskColors = {
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-red-400",
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Insurer Command Center</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="elevated" padding="lg">
          <p className="text-sm text-zinc-500">Weekly Premiums</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">₹{totalPremiums.toLocaleString("en-IN")}</p>
        </Card>
        <Card variant="elevated" padding="lg">
          <p className="text-sm text-zinc-500">Total Payouts</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400 tabular-nums">₹{totalPayouts.toLocaleString("en-IN")}</p>
        </Card>
        <Card variant="elevated" padding="lg">
          <p className="text-sm text-zinc-500">Loss Ratio</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{lossRatio}%</p>
        </Card>
        <Card variant="elevated" padding="lg">
          <p className="text-sm text-zinc-500">Flagged Claims</p>
          <p className="text-2xl font-bold mt-1 text-amber-400 tabular-nums">{flaggedCount}</p>
        </Card>
      </div>

      <RunAdjudicatorButton />

      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10">
            <TrendingUp className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-100">Next Week Prediction</h2>
            <p className="text-sm text-zinc-500">{nextWeekPrediction.source === "forecast" ? "From weather forecast" : "From historical claims"}</p>
          </div>
        </div>
        <p className="text-2xl font-bold mt-2">
          <span className={riskColors[nextWeekPrediction.riskLevel]}>{nextWeekPrediction.expectedClaimsRange}</span>
          <span className="text-zinc-500 font-normal text-base ml-2">expected claims</span>
        </p>
        {nextWeekPrediction.details && (
          <p className="text-sm text-zinc-500 mt-2">{nextWeekPrediction.details}</p>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/admin/triggers">
          <Card variant="ghost" padding="lg" className="group h-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <Cloud className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-100">Live Trigger Feed</h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Weather, traffic, and social disruption events
                </p>
              </div>
              <span className="ml-auto text-zinc-600 group-hover:text-zinc-400">→</span>
            </div>
          </Card>
        </Link>
        <Link href="/admin/fraud">
          <Card variant="ghost" padding="lg" className="group h-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-100">Fraud Queue</h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Flagged claims for review
                </p>
              </div>
              <span className="ml-auto text-zinc-600 group-hover:text-zinc-400">→</span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
