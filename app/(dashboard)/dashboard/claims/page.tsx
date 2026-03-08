import { createClient } from "@/lib/supabase/server";
import {
    AlertCircle,
    ArrowLeft,
    BarChart3,
    Car,
    CheckCircle,
    Clock,
    Cloud,
    MapPin,
    Megaphone,
    Shield,
    TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function eventTypeLabel(type: string) {
  const map: Record<string, string> = {
    weather: "Weather",
    traffic: "Traffic",
    social: "Social",
  };
  return map[type] ?? type;
}

function eventTypeIcon(type: string) {
  const cls = { width: 14, height: 14 };
  if (type === "weather") return <Cloud style={cls} />;
  if (type === "traffic") return <Car style={cls} />;
  if (type === "social") return <Megaphone style={cls} />;
  return <MapPin style={cls} />;
}

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

  const policyMap = new Map(
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
    .filter((c) => !c.is_flagged)
    .reduce((s, c) => s + Number(c.payout_amount_inr), 0);

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Dashboard
      </Link>

      {/* Title */}
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-white">Claims History</h1>
        <p className="text-[12px] text-zinc-500 mt-0.5">Parametric payouts from your policies</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[20px] bg-surface-1 border border-white/10/70 p-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-sky-500/12 mb-3">
            <BarChart3 className="text-sky-400" style={{ width: 15, height: 15 }} />
          </div>
          <p className="text-[22px] font-bold text-white tabular-nums leading-none">
            {claims?.length ?? 0}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">Total</p>
        </div>
        <div className="rounded-[20px] bg-surface-1 border border-white/10/70 p-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-uber-green/12 mb-3">
            <TrendingUp className="text-uber-green" style={{ width: 15, height: 15 }} />
          </div>
          <p className="text-[20px] font-bold text-uber-green tabular-nums leading-none">
            ₹{totalPaid.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">Paid out</p>
        </div>
        <div className="rounded-[20px] bg-surface-1 border border-white/10/70 p-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-violet-500/12 mb-3">
            <Shield className="text-violet-400" style={{ width: 15, height: 15 }} />
          </div>
          <p className="text-[22px] font-bold text-white tabular-nums leading-none">
            {policies?.length ?? 0}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">Policies</p>
        </div>
      </div>

      {/* Claims list */}
      {!claims || claims.length === 0 ? (
        <div className="rounded-[24px] bg-surface-1 border border-white/10/70 px-5 py-14 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#1a2030] mx-auto mb-4">
            <Clock className="text-[#404860]" style={{ width: 24, height: 24 }} />
          </div>
          <p className="text-[14px] font-semibold text-zinc-400">No claims yet</p>
          <p className="text-[12px] text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Claims appear automatically when a disruption is detected in your zone
          </p>
        </div>
      ) : (
        <div className="rounded-[24px] bg-surface-1 border border-white/10/70 overflow-hidden">
          {/* List header */}
          <div className="px-5 py-3.5 border-b border-white/10/50">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.12em]">
              {claims.length} {claims.length === 1 ? "claim" : "claims"}
            </p>
          </div>

          <div className="divide-y divide-white/10/40">
            {claims.map((claim) => {
              const event = claim.live_disruption_events as
                | { event_type?: string; severity_score?: number; created_at?: string }
                | null;
              const policy = policyMap.get(claim.policy_id);

              return (
                <div key={claim.id} className="px-5 py-4 flex items-start gap-3.5">
                  {/* Status icon */}
                  <div className="shrink-0 mt-0.5">
                    {claim.is_flagged ? (
                      <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-uber-yellow/12">
                        <AlertCircle className="text-uber-yellow" style={{ width: 16, height: 16 }} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-uber-green/12">
                        <CheckCircle className="text-uber-green" style={{ width: 16, height: 16 }} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Amount + date */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[15px] font-bold text-white tabular-nums">
                        +₹{Number(claim.payout_amount_inr).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-[#404860] shrink-0 tabular-nums">
                        {new Date(claim.created_at).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Event type */}
                    {event?.event_type && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-zinc-500">
                          {eventTypeIcon(event.event_type)}
                        </span>
                        <span className="text-[12px] text-zinc-400">
                          {eventTypeLabel(event.event_type)}
                          {event.severity_score != null && (
                            <span className="text-[#404860]"> · {event.severity_score}/10</span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Policy badge */}
                    {policy && (
                      <p className="text-[10px] text-[#404860]">
                        {policy.planName} ·{" "}
                        {new Date(policy.weekStart).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}

                    {/* Flagged notice */}
                    {claim.is_flagged && claim.flag_reason && (
                      <div className="mt-2 rounded-[10px] bg-uber-yellow/8 border border-uber-yellow/15 px-3 py-2">
                        <p className="text-[11px] text-uber-yellow font-medium">
                          Under review: {claim.flag_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
