"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle, AlertCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

interface ApiCheck {
  name: string;
  ok: boolean;
  status: number;
}

interface HealthData {
  status: "healthy" | "degraded" | "warning";
  lastAdjudicatorRun: {
    at: string;
    candidatesFound: number;
    claimsCreated: number;
    durationMs: number;
  } | null;
  errors24h: number;
  apis: ApiCheck[];
  recentLogs: Array<{
    event_type: string;
    severity: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
}

const STATUS_STYLES = {
  healthy: { label: "Healthy", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  warning: { label: "Warning", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  degraded: { label: "Degraded", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SystemHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/admin/system-health");
      if (res.ok) setData(await res.json());
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-8 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-8 text-center">
        <p className="text-sm text-zinc-600">Unable to load health data</p>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[data.status];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-zinc-600" />
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
            System Health
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${statusStyle.bg} ${statusStyle.color}`}
          >
            {statusStyle.label}
          </span>
          <button
            onClick={() => load(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Last adjudicator run */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
            Last Adjudicator Run
          </p>
          {data.lastAdjudicatorRun ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">
                {timeAgo(data.lastAdjudicatorRun.at)}
              </span>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>{data.lastAdjudicatorRun.candidatesFound} events</span>
                <span>{data.lastAdjudicatorRun.claimsCreated} payouts</span>
                <span>{data.lastAdjudicatorRun.durationMs}ms</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">No runs logged yet</p>
          )}
        </div>

        {/* Errors */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
            Errors (24h)
          </p>
          <span
            className={`text-sm font-semibold tabular-nums ${
              data.errors24h > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {data.errors24h}
          </span>
        </div>

        {/* API status */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
            External APIs
          </p>
          <div className="space-y-1.5">
            {data.apis.map((api) => (
              <div key={api.name} className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{api.name}</span>
                <div className="flex items-center gap-1.5">
                  {api.ok ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span
                    className={`text-[10px] font-medium ${
                      api.ok ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {api.ok ? "OK" : "DOWN"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent log events */}
        {data.recentLogs.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              Recent Events
            </p>
            <div className="space-y-1">
              {data.recentLogs.slice(0, 5).map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {log.severity === "error" ? (
                    <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                  ) : log.severity === "warning" ? (
                    <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-zinc-600 shrink-0" />
                  )}
                  <span className="text-zinc-500 flex-1 truncate">
                    {log.event_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-zinc-700 shrink-0">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
