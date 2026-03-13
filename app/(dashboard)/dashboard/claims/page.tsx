import { createClient } from "@/lib/supabase/server";
import { KPICard } from "@/components/ui/KPICard";
import { RealtimeProvider } from "@/components/rider/RealtimeProvider";
import { RealtimeClaimsList } from "@/components/rider/RealtimeClaimsList";
import {
    ArrowLeft,
    Clock,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ClaimsHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: policies } = await supabase
    .from("weekly_policies")
    .select("id, week_start_date, week_end_date, plan_packages(name)")
    .eq("profile_id", user.id)
    .order("week_start_date", { ascending: false });

  const policyIds = (policies ?? []).map((p) => p.id);

  const { data: claims } = await supabase
    .from("parametric_claims")
    .select(`
      id,
      payout_amount_inr,
      status,
      is_flagged,
      flag_reason,
      created_at,
      policy_id,
      disruption_event_id,
      live_disruption_events(event_type, severity_score, created_at)
    `)
    .in("policy_id", policyIds.length > 0 ? policyIds : ["none"])
    .order("created_at", { ascending: false })
    .limit(50);

  const policyMap = Object.fromEntries(
    (policies ?? []).map((p) => [
      p.id,
      {
        weekStart: p.week_start_date,
        weekEnd: p.week_end_date,
        planName: (p.plan_packages as { name?: string } | null)?.name ?? "Plan",
      },
    ])
  );

  const totalPaid = (claims ?? [])
    .filter((c) => c.status === "paid" && !c.is_flagged)
    .reduce((s, c) => s + Number(c.payout_amount_inr), 0);

  return (
    <RealtimeProvider profileId={user.id} policyIds={policyIds}>
      <div className="space-y-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 active:text-zinc-200 transition-colors min-h-[44px] -ml-1 px-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Claims History</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">Parametric payouts from your policies</p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <KPICard
            title="Total"
            count={claims?.length ?? 0}
            label="Claims"
            value={claims?.length ?? 0}
            accent="blue"
            index={0}
          />
          <KPICard
            title="Paid out"
            label="Amount"
            value={`₹${totalPaid.toLocaleString("en-IN")}`}
            accent="emerald"
            index={1}
          />
          <KPICard
            title="Policies"
            count={policies?.length ?? 0}
            label="Coverage weeks"
            value={policies?.length ?? 0}
            accent="violet"
            index={2}
          />
        </div>

        {!claims || claims.length === 0 ? (
          <div className="rounded-2xl bg-surface-1 border border-white/10 px-5 py-14 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#1a2030] mx-auto mb-4">
              <Clock className="text-[#404860]" style={{ width: 24, height: 24 }} />
            </div>
            <p className="text-[14px] font-semibold text-zinc-400">No claims yet</p>
            <p className="text-[12px] text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Claims appear automatically when a disruption is detected in your zone
            </p>
          </div>
        ) : (
          <RealtimeClaimsList claims={claims} policyMap={policyMap} />
        )}
      </div>
    </RealtimeProvider>
  );
}
