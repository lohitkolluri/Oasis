'use client';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TRUST_TABLE_INNER_MIN_WIDTH,
  TRUST_TABLE_SCROLL_CLASS,
} from '@/components/admin/trust-console-tokens';
import { cn } from '@/lib/utils';
import { gooeyToast } from 'goey-toast';
import { AlertTriangle, CheckCircle2, Radio, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export interface SourceHealthRow {
  source_id: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_detail?: string | null;
  last_observed_at: string | null;
  error_streak: number;
  success_streak: number;
  avg_latency_ms: number | null;
  last_latency_ms: number | null;
  is_fallback: boolean;
  fallback_of: string | null;
}

function fmt(ts: string | null | undefined) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function sourceLabel(id: string) {
  return id.replace(/_/g, ' ');
}

interface ParametricSourceHealthProps {
  rows: SourceHealthRow[];
  /** When embedded inside TriggerTrustConsole, omit outer Card. */
  variant?: 'standalone' | 'embedded';
}

export function ParametricSourceHealth({ rows, variant = 'standalone' }: ParametricSourceHealthProps) {
  const [localRows, setLocalRows] = useState<SourceHealthRow[]>(rows);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);

  const sortedRows = useMemo(
    () => [...localRows].sort((a, b) => a.source_id.localeCompare(b.source_id)),
    [localRows],
  );

  const selectedCount = selected.size;
  const allSelected = sortedRows.length > 0 && selectedCount === sortedRows.length;

  useEffect(() => {
    setLocalRows(rows);
    setSelected(new Set());
  }, [rows]);

  function toggleOne(sourceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (sortedRows.length === 0) return prev;
      if (prev.size === sortedRows.length) return new Set();
      return new Set(sortedRows.map((r) => r.source_id));
    });
  }

  async function resetSelected() {
    const sourceIds = Array.from(selected);
    if (sourceIds.length === 0 || resetting) return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-source-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to reset source health');
      }
      setLocalRows((prev) =>
        prev.map((row) =>
          selected.has(row.source_id)
            ? {
                ...row,
                error_streak: 0,
                success_streak: 0,
                last_error_at: null,
              }
            : row,
        ),
      );
      setSelected(new Set());
      gooeyToast.success(`Reset ${sourceIds.length} source${sourceIds.length > 1 ? 's' : ''}`);
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  }

  const inner = (
    <>
      {localRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#2d2d2d] bg-[#0c0c0c] px-4 py-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#3ECF8E]/20 bg-[#3ECF8E]/5">
            <Radio className="h-4 w-4 text-[#3ECF8E]/80" />
          </div>
          <p className="mt-3 text-sm font-medium text-[#a3a3a3]">No ingestion probes yet</p>
          <p className="mt-1 text-xs text-[#525252] max-w-sm mx-auto">
            Rows appear after the next adjudicator run once the{' '}
            <code className="rounded bg-[#1a1a1a] px-1 py-0.5 text-[10px] text-[#9ca3af]">
              parametric_source_health
            </code>{' '}
            migration is applied.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#232323] bg-[#111111] px-3 py-2">
            <label className="inline-flex items-center gap-2 text-xs text-[#a3a3a3] cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-3.5 w-3.5 rounded border-[#3a3a3a] bg-[#0f0f0f] text-[#3ECF8E] focus:ring-[#3ECF8E]/40"
              />
              Select all
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#737373] tabular-nums">
                {selectedCount} selected
              </span>
              <Button
                type="button"
                size="sm"
                disabled={selectedCount === 0 || resetting}
                onClick={resetSelected}
                className="h-7 rounded-lg px-2.5 text-[11px]"
              >
                {resetting ? 'Resetting…' : 'Reset selected'}
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-[#232323] overflow-hidden bg-[#161616] shadow-[0_0_0_1px_rgba(15,15,15,0.6)]">
          <ScrollArea className={TRUST_TABLE_SCROLL_CLASS}>
            <div className={TRUST_TABLE_INNER_MIN_WIDTH}>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2d2d2d] hover:bg-transparent">
                    <TableHead className="sticky top-0 z-20 w-10 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      <span className="sr-only">Select</span>
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Source
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Last OK
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Last error
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-right text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Streak
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-right text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      RTT
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Fallback
                    </TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {sortedRows.map((r) => {
                  const ok = r.error_streak === 0;
                  return (
                    <TableRow
                      key={r.source_id}
                      className={cn(
                        'border-[#2d2d2d] transition-colors',
                        'hover:bg-[#191919]',
                      )}
                    >
                      <TableCell className="align-middle">
                        <input
                          type="checkbox"
                          checked={selected.has(r.source_id)}
                          onChange={() => toggleOne(r.source_id)}
                          className="h-3.5 w-3.5 rounded border-[#3a3a3a] bg-[#0f0f0f] text-[#3ECF8E] focus:ring-[#3ECF8E]/40"
                          aria-label={`Select ${sourceLabel(r.source_id)}`}
                        />
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-2">
                          {ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#3ECF8E]" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-[#f87171]" />
                          )}
                          <span className="font-mono text-[11px] font-medium text-[#e5e5e5]">
                            {sourceLabel(r.source_id)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#9ca3af] tabular-nums">
                        {fmt(r.last_success_at)}
                      </TableCell>
                      <TableCell className="text-xs text-[#737373] tabular-nums">
                        <span title={r.last_error_detail ?? ''}>{fmt(r.last_error_at)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.error_streak > 0 ? (
                          <Badge
                            variant="secondary"
                            className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-400 text-[10px] font-semibold tabular-nums"
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {r.error_streak}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="rounded-full border border-[#3ECF8E]/25 bg-[#3ECF8E]/10 text-[#3ECF8E] text-[10px] font-medium tabular-nums"
                          >
                            0
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs tabular-nums text-[#a3a3a3]">
                          {r.last_latency_ms != null ? `${Math.round(r.last_latency_ms)} ms` : '—'}
                        </span>
                        {r.avg_latency_ms != null && (
                          <span className="block text-[10px] text-[#525252]">
                            μ ~{Math.round(r.avg_latency_ms)} ms
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.is_fallback ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full border border-sky-500/25 bg-sky-500/10 text-sky-300 text-[10px]"
                          >
                            {r.fallback_of ? `← ${r.fallback_of.replace(/_/g, ' ')}` : 'Fallback'}
                          </Badge>
                        ) : (
                          <span className="text-[#3f3f3f]">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
        </div>
      )}
    </>
  );

  if (variant === 'embedded') {
    return inner;
  }

  return (
    <Card variant="default" padding="lg">
      <CardHeader
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3ECF8E]/25 bg-[#3ECF8E]/10">
            <Radio className="h-4 w-4 text-[#3ECF8E]" />
          </div>
        }
        title="Ingestion sources"
        description="Freshness, error streaks, latency — aligned with Supabase observability patterns"
      />
      {inner}
    </Card>
  );
}
