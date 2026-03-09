'use client';

import { motion } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ApiCheck {
  name: string;
  ok: boolean;
  status: number;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'warning' | 'unhealthy';
  lastAdjudicatorRun: {
    runId: string | null;
    at: string;
    severity?: string;
    candidatesFound: number;
    claimsCreated: number;
    payoutsInitiated?: number;
    durationMs: number;
    error?: string | null;
    payoutFailures?: number | null;
    logFailures?: number | null;
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

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; border: string }> =
  {
    healthy: {
      label: 'Healthy',
      dot: 'bg-[#22c55e]',
      text: 'text-[#22c55e]',
      border: 'border-[#22c55e]/20',
    },
    warning: {
      label: 'Warning',
      dot: 'bg-[#f59e0b]',
      text: 'text-[#f59e0b]',
      border: 'border-[#f59e0b]/20',
    },
    degraded: {
      label: 'Degraded',
      dot: 'bg-[#ef4444]',
      text: 'text-[#ef4444]',
      border: 'border-[#ef4444]/20',
    },
    unhealthy: {
      label: 'Unhealthy',
      dot: 'bg-[#ef4444]',
      text: 'text-[#ef4444]',
      border: 'border-[#ef4444]/20',
    },
  };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
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
      const res = await fetch('/api/admin/system-health');
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl px-5 py-8 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-[#7dd3fc]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl px-5 py-8 text-center">
        <p className="text-sm text-[#666666]">Unable to load health data</p>
      </div>
    );
  }

  const s = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.degraded;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.03)]"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2d2d2d] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="h-4 w-4 text-[#7dd3fc]" />
          <span className="text-sm font-semibold text-white">System Health</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${s.border} bg-transparent`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot} shrink-0`} />
            <span className={`text-[10px] font-semibold ${s.text}`}>{s.label}</span>
          </div>
          <button
            onClick={() => load(true)}
            className="text-[#666666] hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Last run */}
        <div>
          <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em] mb-2">
            Last Adjudicator Run
          </p>
          {data.lastAdjudicatorRun ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">
                  {timeAgo(data.lastAdjudicatorRun.at)}
                </span>
                {data.lastAdjudicatorRun.runId && (
                  <span
                    className="text-[10px] font-mono text-[#666666] truncate max-w-[180px]"
                    title={data.lastAdjudicatorRun.runId}
                  >
                    {data.lastAdjudicatorRun.runId.slice(0, 8)}…
                  </span>
                )}
                {data.lastAdjudicatorRun.severity === 'error' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444]">
                    Run error
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#262626] text-[#666666]">
                  {data.lastAdjudicatorRun.candidatesFound} events
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc]">
                  {data.lastAdjudicatorRun.claimsCreated} payouts
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#262626] text-[#666666]">
                  {data.lastAdjudicatorRun.durationMs}ms
                </span>
                {((data.lastAdjudicatorRun.payoutFailures ?? 0) > 0 ||
                  (data.lastAdjudicatorRun.logFailures ?? 0) > 0) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
                    {(data.lastAdjudicatorRun.payoutFailures ?? 0) +
                      (data.lastAdjudicatorRun.logFailures ?? 0)}{' '}
                    failures
                  </span>
                )}
              </div>
              {data.lastAdjudicatorRun.error && (
                <p
                  className="text-[10px] text-[#ef4444] truncate max-w-full"
                  title={data.lastAdjudicatorRun.error}
                >
                  {data.lastAdjudicatorRun.error}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#666666]">No runs logged yet</p>
          )}
        </div>

        {/* Errors */}
        <div className="flex items-center justify-between py-3 border-t border-[#2d2d2d]">
          <p className="text-xs font-medium text-[#9ca3af]">Errors (24h)</p>
          <span
            className={`text-sm font-bold tabular-nums ${data.errors24h > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}
          >
            {data.errors24h}
          </span>
        </div>

        {/* APIs */}
        <div>
          <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em] mb-2.5">
            External APIs
          </p>
          <div className="space-y-2">
            {data.apis.map((api) => (
              <div key={api.name} className="flex items-center justify-between">
                <span className="text-xs text-[#9ca3af]">{api.name}</span>
                <div className="flex items-center gap-1.5">
                  {api.ok ? (
                    <CheckCircle className="h-3.5 w-3.5 text-[#22c55e]" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-[#ef4444]" />
                  )}
                  <span
                    className={`text-[10px] font-semibold ${api.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}
                  >
                    {api.ok ? 'OK' : 'DOWN'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent logs */}
        {data.recentLogs.length > 0 && (
          <div className="border-t border-[#2d2d2d] pt-4">
            <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em] mb-2.5">
              Recent Events
            </p>
            <div className="space-y-1.5">
              {data.recentLogs.slice(0, 5).map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {log.severity === 'error' ? (
                    <XCircle className="h-3 w-3 text-[#ef4444] shrink-0" />
                  ) : log.severity === 'warning' ? (
                    <AlertCircle className="h-3 w-3 text-[#f59e0b] shrink-0" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-[#666666] shrink-0" />
                  )}
                  <span className="text-[#666666] flex-1 truncate">
                    {log.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[#3a3a3a] shrink-0">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
