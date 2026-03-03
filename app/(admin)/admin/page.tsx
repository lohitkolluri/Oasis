import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Insurer Command Center</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <p className="text-sm text-zinc-400">Weekly Premiums</p>
          <p className="text-2xl font-bold mt-1">₹{totalPremiums.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <p className="text-sm text-zinc-400">Total Payouts</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">₹{totalPayouts.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <p className="text-sm text-zinc-400">Loss Ratio</p>
          <p className="text-2xl font-bold mt-1">{lossRatio}%</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <p className="text-sm text-zinc-400">Flagged Claims</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{flaggedCount}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/admin/triggers"
          className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 flex-1 hover:border-zinc-600 transition-colors"
        >
          <h2 className="font-semibold mb-2">Live Trigger Feed</h2>
          <p className="text-sm text-zinc-400">
            Weather, traffic, and social disruption events
          </p>
        </Link>
        <Link
          href="/admin/fraud"
          className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 flex-1 hover:border-zinc-600 transition-colors"
        >
          <h2 className="font-semibold mb-2">Fraud Queue</h2>
          <p className="text-sm text-zinc-400">
            Flagged claims for review
          </p>
        </Link>
      </div>
    </div>
  );
}
