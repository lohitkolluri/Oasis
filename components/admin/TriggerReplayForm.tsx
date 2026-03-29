'use client';

import {
  TRUST_TABLE_INNER_MIN_WIDTH,
  TRUST_TABLE_SCROLL_CLASS,
} from '@/components/admin/trust-console-tokens';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Loader2, Play, Save, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

type ReplayRow = {
  disruption_event_id: string;
  event_subtype: string | null;
  created_at: string;
  would_fire: boolean;
  simulated_outcome: string;
  reason: string;
  rule_version_applied: string;
};

interface TriggerReplayFormProps {
  variant?: 'standalone' | 'embedded';
}

export function TriggerReplayForm({ variant = 'standalone' }: TriggerReplayFormProps) {
  const defaults = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      from: from.toISOString().slice(0, 16),
      to: to.toISOString().slice(0, 16),
    };
  }, []);

  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReplayRow[] | null>(null);
  const [meta, setMeta] = useState<{ persisted: number } | null>(null);

  async function run(persistDryRun: boolean) {
    setLoading(true);
    setError(null);
    setMeta(null);
    try {
      const res = await fetch('/api/admin/triggers/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          from: new Date(from).toISOString(),
          to: new Date(to).toISOString(),
          persistDryRun,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        rows?: ReplayRow[];
        persistedDryRunRows?: number;
      };
      if (!res.ok) {
        setError(data.error ?? 'Replay failed');
        setRows(null);
        return;
      }
      setRows(data.rows ?? []);
      setMeta({ persisted: data.persistedDryRunRows ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  const formBody = (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">From</span>
          <Input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 border-[#2d2d2d] bg-[#111111] text-sm text-zinc-100 focus-visible:border-[#3ECF8E]/50 focus-visible:ring-[#3ECF8E]/20"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">To</span>
          <Input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 border-[#2d2d2d] bg-[#111111] text-sm text-zinc-100 focus-visible:border-[#3ECF8E]/50 focus-visible:ring-[#3ECF8E]/20"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={loading}
          onClick={() => run(false)}
          className={cn(
            'h-9 gap-1.5 border border-[#3ECF8E]/35 bg-[#3ECF8E]/15 text-[#3ECF8E] hover:bg-[#3ECF8E]/25',
          )}
          variant="ghost"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run dry-run
        </Button>
        <Button
          type="button"
          disabled={loading}
          onClick={() => run(true)}
          variant="outline"
          className="h-9 gap-1.5 border-violet-500/30 bg-violet-500/5 text-violet-200 hover:bg-violet-500/15"
        >
          <Save className="h-3.5 w-3.5" />
          Persist to ledger
        </Button>
      </div>

      <Separator className="bg-[#2d2d2d]" />

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">{error}</p>
      )}
      {meta && meta.persisted > 0 && (
        <p className="text-xs text-violet-300/90">
          Persisted <span className="font-mono font-semibold">{meta.persisted}</span> dry-run ledger row(s).
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="rounded-xl border border-[#232323] overflow-hidden bg-[#161616] shadow-[0_0_0_1px_rgba(15,15,15,0.6)]">
          <ScrollArea className={TRUST_TABLE_SCROLL_CLASS}>
            <div className={TRUST_TABLE_INNER_MIN_WIDTH}>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2d2d2d]">
                    <th className="sticky top-0 z-20 bg-[#181818] p-2.5 font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Time
                    </th>
                    <th className="sticky top-0 z-20 bg-[#181818] p-2.5 font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Subtype
                    </th>
                    <th className="sticky top-0 z-20 bg-[#181818] p-2.5 font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Fire
                    </th>
                    <th className="sticky top-0 z-20 bg-[#181818] p-2.5 font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Simulated
                    </th>
                    <th className="sticky top-0 z-20 bg-[#181818] p-2.5 font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Rule
                    </th>
                    <th className="sticky top-0 z-20 bg-[#181818] p-2.5 font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                    )
                    .map((r) => (
                      <tr
                        key={r.disruption_event_id}
                        className="border-t border-[#262626] transition-colors hover:bg-[#191919]"
                      >
                        <td className="whitespace-nowrap p-2.5 tabular-nums text-[#737373]">
                          {new Date(r.created_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-[#d4d4d4]">
                          {r.event_subtype ?? '—'}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              r.would_fire
                                ? 'bg-[#3ECF8E]/15 text-[#3ECF8E] ring-1 ring-inset ring-[#3ECF8E]/30'
                                : 'bg-[#262626] text-[#737373]',
                            )}
                          >
                            {r.would_fire ? 'yes' : 'no'}
                          </span>
                        </td>
                        <td className="p-2.5 capitalize text-[#a3a3a3]">
                          {r.simulated_outcome.replace(/_/g, ' ')}
                        </td>
                        <td
                          className="max-w-[120px] truncate p-2.5 font-mono text-[10px] text-[#6b7280]"
                          title={r.rule_version_applied}
                        >
                          {r.rule_version_applied}
                        </td>
                        <td className="max-w-[220px] p-2.5 text-[#6b7280]" title={r.reason}>
                          {r.reason}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </div>
      )}

      {rows && rows.length === 0 && !loading && (
        <p className="text-xs text-[#525252]">No disruption events in that window.</p>
      )}
    </div>
  );

  if (variant === 'embedded') {
    return formBody;
  }

  return (
    <Card variant="default" padding="lg">
      <CardHeader
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/25 bg-violet-500/10">
            <Sparkles className="h-4 w-4 text-violet-300" />
          </div>
        }
        title="Dry-run / replay"
        description="Re-evaluate stored snapshots against current TRIGGERS; optional append-only dry-run rows"
      />
      {formBody}
    </Card>
  );
}
