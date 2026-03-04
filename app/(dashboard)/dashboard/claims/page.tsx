import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default async function ClaimsHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get all policies for this rider
  const { data: policies } = await supabase
    .from("weekly_policies")
    .select("id, week_start_date, week_end_date, plan_packages(name)")
    .eq("profile_id", user.id)
    .order("week_start_date", { ascending: false });

  const policyIds = (policies ?? []).map((p) => p.id);

  // Fetch full claims history with event details
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

  function eventTypeLabel(type: string) {
    const map: Record<string, string> = {
      weather: "🌦 Weather",
      traffic: "🚦 Traffic",
      social: "🚫 Social",
    };
    return map[type] ?? type;
  }

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Claims History</h1>
        <p className="text-sm text-zinc-500 mt-0.5">All parametric payouts from your policies</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">
            Total Claims
          </p>
          <p className="text-2xl font-bold text-zinc-100 tabular-nums">{claims?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">
            Total Paid
          </p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">
            ₹{totalPaid.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">
            Policies
          </p>
          <p className="text-2xl font-bold text-zinc-100 tabular-nums">{policies?.length ?? 0}</p>
        </div>
      </div>

      {/* Claims list */}
      {!claims || claims.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-14 text-center">
          <Clock className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">No claims yet</p>
          <p className="text-xs text-zinc-700 mt-1">
            Claims appear automatically when a disruption is detected in your zone
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
              {claims.length} claim{claims.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-zinc-800/70">
            {claims.map((claim) => {
              const event = claim.live_disruption_events as
                | { event_type?: string; severity_score?: number; created_at?: string }
                | null;
              const policy = policyMap.get(claim.policy_id);

              return (
                <div key={claim.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="mt-0.5 shrink-0">
                    {claim.is_flagged ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-100 tabular-nums">
                        ₹{Number(claim.payout_amount_inr).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-zinc-600 shrink-0">
                        {new Date(claim.created_at).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {event?.event_type ? eventTypeLabel(event.event_type) : "Disruption"}{" "}
                      {event?.severity_score != null && (
                        <span className="text-zinc-700">· severity {event.severity_score}/10</span>
                      )}
                    </p>
                    {policy && (
                      <p className="text-[10px] text-zinc-700 mt-1">
                        {policy.planName} · Week of{" "}
                        {new Date(policy.weekStart).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                    {claim.is_flagged && claim.flag_reason && (
                      <p className="text-[10px] text-amber-600 mt-1 bg-amber-500/10 rounded px-2 py-0.5 inline-block">
                        Under review: {claim.flag_reason}
                      </p>
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
