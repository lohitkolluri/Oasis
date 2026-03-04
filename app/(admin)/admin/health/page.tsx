import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SystemHealth } from "@/components/admin/SystemHealth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function HealthPage() {
  const supabase = createAdminClient();

  // Fetch recent system logs for the full log view
  let recentLogs: Array<{
    id: string;
    event_type: string;
    severity: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }> = [];
  try {
    const { data } = await supabase
      .from("system_logs")
      .select("id, event_type, severity, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    recentLogs = (data ?? []) as typeof recentLogs;
  } catch {
    // Table may not exist yet
  }

  const SEVERITY_STYLES: Record<string, string> = {
    info: "text-zinc-500",
    warning: "text-amber-400",
    error: "text-red-400",
  };

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">System Health</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Live API status, adjudicator run history, and platform event log
        </p>
      </div>

      <SystemHealth />

      {/* Full log table */}
      <div>
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Event Log
        </p>
        {recentLogs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-10 text-center">
            <p className="text-sm text-zinc-600">No events logged yet — run the adjudicator to start</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="px-5 py-2.5 border-b border-zinc-800 grid grid-cols-[auto_1fr_auto_auto] gap-4">
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Severity</span>
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Event</span>
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Details</span>
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Time</span>
            </div>
            <div className="divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-5 py-2.5 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center text-xs"
                >
                  <span
                    className={`font-semibold uppercase text-[10px] ${
                      SEVERITY_STYLES[log.severity] ?? "text-zinc-500"
                    }`}
                  >
                    {log.severity}
                  </span>
                  <span className="text-zinc-400 truncate">
                    {log.event_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-zinc-600 truncate max-w-[200px]">
                    {log.metadata?.claims_created != null
                      ? `${log.metadata.claims_created} claims · ${log.metadata.duration_ms}ms`
                      : log.metadata?.action
                      ? `${log.metadata.action} by ${log.metadata.reviewed_by ?? "admin"}`
                      : log.metadata?.error
                      ? String(log.metadata.error).slice(0, 40)
                      : "—"}
                  </span>
                  <span className="text-zinc-700 shrink-0 tabular-nums">
                    {new Date(log.created_at).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
