'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { CopyableId } from '@/components/ui/CopyableId';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

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

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; badgeClass: string }
> = {
  healthy: {
    label: 'Healthy',
    dot: 'bg-[#22c55e]',
    badgeClass:
      'border-[#22c55e]/25 bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-semibold',
  },
  warning: {
    label: 'Warning',
    dot: 'bg-[#f59e0b]',
    badgeClass:
      'border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-semibold',
  },
  degraded: {
    label: 'Degraded',
    dot: 'bg-[#ef4444]',
    badgeClass:
      'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#ef4444] text-[10px] font-semibold',
  },
  unhealthy: {
    label: 'Unhealthy',
    dot: 'bg-[#ef4444]',
    badgeClass:
      'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#ef4444] text-[10px] font-semibold',
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
      <Card variant="default" padding="lg" className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-[#7dd3fc]" />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card variant="default" padding="lg" className="text-center">
        <p className="text-sm text-[#555]">Unable to load health data</p>
      </Card>
    );
  }

  const s = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.degraded;
  const run = data.lastAdjudicatorRun;

  return (
    <Card variant="default" padding="none">
      <CardHeader
        icon={<Activity className="h-4 w-4 text-[#7dd3fc]" />}
        title="System Health"
        description="API status, last run, and recent events"
        badge={
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn('rounded-full border', s.badgeClass)}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0 mr-1', s.dot)} />
              {s.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => load(true)}
              disabled={refreshing}
              title="Refresh"
              className="text-[#555] hover:text-white"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
              />
            </Button>
          </div>
        }
        className="px-5 pt-5 pb-2"
      />

      <div className="px-5 pb-5 space-y-5">
        {/* Last run + Errors row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] p-4">
            <p className="text-[10px] font-medium text-[#555] uppercase tracking-wider mb-2">
              Last Adjudicator Run
            </p>
            {run ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {timeAgo(run.at)}
                  </span>
                  {run.runId && (
                    <CopyableId
                      value={run.runId}
                      prefix=""
                      length={8}
                      label="Copy run ID"
                      className="text-[10px]"
                    />
                  )}
                  {run.severity === 'error' && (
                    <Badge
                      variant="secondary"
                      className="rounded-full border border-[#ef4444]/25 bg-[#ef4444]/10 text-[#ef4444] text-[10px]"
                    >
                      Run error
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-[#2d2d2d] bg-[#262626] text-[#666] text-[10px] font-medium px-2 py-0"
                  >
                    {run.candidatesFound} events
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-[#7dd3fc]/20 bg-[#7dd3fc]/10 text-[#7dd3fc] text-[10px] font-medium px-2 py-0"
                  >
                    {run.claimsCreated} payouts
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-[#2d2d2d] bg-[#262626] text-[#666] text-[10px] font-medium px-2 py-0"
                  >
                    {run.durationMs}ms
                  </Badge>
                  {((run.payoutFailures ?? 0) > 0 || (run.logFailures ?? 0) > 0) && (
                    <Badge
                      variant="secondary"
                      className="rounded-full border border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-medium px-2 py-0"
                    >
                      {(run.payoutFailures ?? 0) + (run.logFailures ?? 0)} failures
                    </Badge>
                  )}
                </div>
                {run.error && (
                  <p
                    className="text-[10px] text-[#ef4444] truncate max-w-full"
                    title={run.error}
                  >
                    {run.error}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#555]">No runs logged yet</p>
            )}
          </div>

          <div className="rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] p-4 flex flex-col justify-center">
            <p className="text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1">
              Errors (24h)
            </p>
            <Badge
              variant="secondary"
              className={cn(
                'w-fit rounded-full text-sm font-bold tabular-nums px-2 py-0',
                data.errors24h > 0
                  ? 'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#ef4444]'
                  : 'border-[#22c55e]/25 bg-[#22c55e]/10 text-[#22c55e]',
              )}
            >
              {data.errors24h}
            </Badge>
          </div>
        </div>

        {/* External APIs */}
        <div>
          <p className="text-[10px] font-medium text-[#555] uppercase tracking-wider mb-2">
            External APIs
          </p>
          <div className="rounded-lg border border-[#2d2d2d] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                  <TableHead className="w-[60%]">Service</TableHead>
                  <TableHead className="w-[40%] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.apis.map((api) => (
                  <TableRow key={api.name} className="border-[#2d2d2d]">
                    <TableCell className="text-xs text-[#9ca3af]">
                      {api.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {api.ok ? (
                          <CheckCircle className="h-3.5 w-3.5 text-[#22c55e]" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-[#ef4444]" />
                        )}
                        <Badge
                          variant="secondary"
                          className={cn(
                            'rounded-full text-[10px] font-semibold px-2 py-0 border',
                            api.ok
                              ? 'border-[#22c55e]/25 bg-[#22c55e]/10 text-[#22c55e]'
                              : 'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#ef4444]',
                          )}
                        >
                          {api.ok ? 'OK' : 'DOWN'}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Recent events */}
        {data.recentLogs.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-[#555] uppercase tracking-wider mb-2">
              Recent Events
            </p>
            <div className="rounded-lg border border-[#2d2d2d] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                    <TableHead className="w-[80%]">Event</TableHead>
                    <TableHead className="w-[20%] text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentLogs.slice(0, 5).map((log, i) => (
                    <TableRow key={i} className="border-[#2d2d2d]">
                      <TableCell className="flex items-center gap-2">
                        {log.severity === 'error' ? (
                          <XCircle className="h-3 w-3 text-[#ef4444] shrink-0" />
                        ) : log.severity === 'warning' ? (
                          <AlertCircle className="h-3 w-3 text-[#f59e0b] shrink-0" />
                        ) : (
                          <CheckCircle className="h-3 w-3 text-[#555] shrink-0" />
                        )}
                        <span className="text-xs text-[#9ca3af]">
                          {log.event_type.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#555] tabular-nums">
                        {timeAgo(log.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
