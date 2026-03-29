'use client';

import { CopyableDisruptionRef } from '@/components/admin/CopyableDisruptionRef';
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
import { FileStack } from 'lucide-react';

export interface LedgerRow {
  id: string;
  created_at: string;
  source: string;
  trigger_subtype: string | null;
  event_type: string | null;
  outcome: string;
  rule_version: string;
  rule_set_id?: string | null;
  claims_created: number | null;
  payouts_initiated: number | null;
  is_dry_run: boolean | null;
  error_message: string | null;
  disruption_event_id: string | null;
}

function OutcomeBadge({ outcome, dryRun }: { outcome: string; dryRun: boolean }) {
  const cfg =
    outcome === 'pay'
      ? 'border-[#3ECF8E]/30 bg-[#3ECF8E]/12 text-[#3ECF8E]'
      : outcome === 'deferred'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-400'
        : 'border-[#404040] bg-[#262626] text-[#a3a3a3]';

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="secondary" className={cn('rounded-full text-[10px] font-semibold capitalize', cfg)}>
        {outcome.replace(/_/g, ' ')}
      </Badge>
      {dryRun && (
        <Badge
          variant="secondary"
          className="rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-300 text-[10px]"
        >
          Replay
        </Badge>
      )}
    </div>
  );
}

interface ParametricLedgerTableProps {
  rows: LedgerRow[];
  variant?: 'standalone' | 'embedded';
}

export function ParametricLedgerTable({ rows, variant = 'standalone' }: ParametricLedgerTableProps) {
  const inner = (
    <>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#2d2d2d] bg-[#0c0c0c] px-4 py-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#525252] bg-[#1a1a1a]">
            <FileStack className="h-4 w-4 text-[#737373]" />
          </div>
          <p className="mt-3 text-sm font-medium text-[#a3a3a3]">No ledger rows in this window</p>
          <p className="mt-1 text-xs text-[#525252] max-w-md mx-auto">
            Append-only entries are written when triggers are adjudicated (
            <code className="rounded bg-[#1a1a1a] px-1 py-0.5 text-[10px]">parametric_trigger_ledger</code>
            ).
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#232323] overflow-hidden bg-[#161616] shadow-[0_0_0_1px_rgba(15,15,15,0.6)]">
          <ScrollArea className={TRUST_TABLE_SCROLL_CLASS}>
            <div className={TRUST_TABLE_INNER_MIN_WIDTH}>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2d2d2d] hover:bg-transparent">
                    <TableHead className="sticky top-0 z-20 whitespace-nowrap bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Time
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Source
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Subtype
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Outcome
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Rule
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Rule set
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-right text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Claims
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#181818] text-xs font-medium text-[#9ca3af] shadow-[inset_0_-1px_0_#2d2d2d]">
                      Evidence
                    </TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className={cn('border-[#2d2d2d] transition-colors', 'hover:bg-[#191919]')}
                  >
                    <TableCell className="whitespace-nowrap text-xs text-[#737373] tabular-nums">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-[#d4d4d4]">{r.source}</TableCell>
                    <TableCell className="text-xs text-[#9ca3af]">{r.trigger_subtype ?? '—'}</TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={r.outcome} dryRun={!!r.is_dry_run} />
                    </TableCell>
                    <TableCell
                      className="max-w-[100px] truncate font-mono text-[10px] text-[#6b7280]"
                      title={r.rule_version}
                    >
                      {r.rule_version}
                    </TableCell>
                    <TableCell
                      className="max-w-[72px] truncate font-mono text-[10px] text-[#525252]"
                      title={r.rule_set_id ?? ''}
                    >
                      {r.rule_set_id ? `${r.rule_set_id.slice(0, 8)}…` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-[#a3a3a3]">
                      {r.claims_created ?? 0}
                      {(r.payouts_initiated ?? 0) > 0 ? (
                        <span className="block text-[10px] text-[#3ECF8E]/90">
                          {r.payouts_initiated} paid
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[160px]" title={r.error_message ?? ''}>
                      {r.disruption_event_id ? (
                        <CopyableDisruptionRef id={r.disruption_event_id} />
                      ) : r.error_message ? (
                        <span className="text-[11px] text-amber-400/90 line-clamp-2">{r.error_message}</span>
                      ) : (
                        <span className="text-[#3f3f3f]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </ScrollArea>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#525252] bg-[#1f1f1f]">
            <FileStack className="h-4 w-4 text-[#a3a3a3]" />
          </div>
        }
        title="Trigger event ledger"
        description="Append-only: source → observed snapshot → rule version → outcome → evidence ref"
      />
      {inner}
    </Card>
  );
}
