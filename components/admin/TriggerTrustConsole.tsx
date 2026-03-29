'use client';

import { ParametricLedgerTable } from '@/components/admin/ParametricLedgerTable';
import type { LedgerRow } from '@/components/admin/ParametricLedgerTable';
import { ParametricSourceHealth } from '@/components/admin/ParametricSourceHealth';
import type { SourceHealthRow } from '@/components/admin/ParametricSourceHealth';
import { TriggerReplayForm } from '@/components/admin/TriggerReplayForm';
import { Card, CardHeader } from '@/components/ui/Card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Database, FileStack, PlayCircle, Radio } from 'lucide-react';
import { useMemo } from 'react';

interface TriggerTrustConsoleProps {
  healthRows: SourceHealthRow[];
  ledgerRows: LedgerRow[];
}

export function TriggerTrustConsole({ healthRows, ledgerRows }: TriggerTrustConsoleProps) {
  const stats = useMemo(() => {
    const withProbe = healthRows.length;
    const healthyNow = healthRows.filter((r) => r.error_streak === 0).length;
    const ledgerPay = ledgerRows.filter((r) => r.outcome === 'pay').length;
    const ledgerDeferred = ledgerRows.filter((r) => r.outcome === 'deferred').length;
    const dryRuns = ledgerRows.filter((r) => r.is_dry_run).length;
    return { withProbe, healthyNow, ledgerPay, ledgerDeferred, dryRuns, ledgerTotal: ledgerRows.length };
  }, [healthRows, ledgerRows]);

  return (
    <Card variant="default" padding="none" className="overflow-hidden shadow-[0_0_0_1px_rgba(15,15,15,0.6)]">
      <CardHeader
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3ECF8E]/25 bg-[#3ECF8E]/10">
            <Database className="h-4 w-4 text-[#3ECF8E]" />
          </div>
        }
        title="Parametric trust & ledger"
        description="Supabase-backed append-only audit, per-source ingestion health, and rule replay"
        className="px-5 pt-5 pb-3"
      />

      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill
            label="Sources tracked"
            value={stats.withProbe}
            sub={stats.healthyNow > 0 ? `${stats.healthyNow} no error streak` : undefined}
          />
          <StatPill label="Ledger rows" value={stats.ledgerTotal} sub="loaded window" />
          <StatPill
            label="Pay outcomes"
            value={stats.ledgerPay}
            className="border-[#3ECF8E]/20 bg-[#3ECF8E]/5"
            valueClass="text-[#3ECF8E]"
          />
          <StatPill
            label="Deferred / dry-run"
            value={stats.ledgerDeferred + stats.dryRuns}
            sub={
              [
                stats.ledgerDeferred > 0 ? `${stats.ledgerDeferred} deferred` : null,
                stats.dryRuns > 0 ? `${stats.dryRuns} replay` : null,
              ]
                .filter((x): x is string => Boolean(x))
                .join(' · ') || undefined
            }
          />
        </div>
      </div>

      <Separator className="bg-[#2d2d2d]" />

      <Tabs defaultValue="sources" className="w-full">
        <div className="px-5 pt-3 pb-0">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-[#2d2d2d] bg-[#141414] p-1.5 sm:w-auto sm:flex-nowrap">
            <TabsTrigger
              value="sources"
              className={cn(
                'gap-1.5 rounded-lg px-3 py-2 text-[12px] data-[state=active]:shadow-none',
                'data-[state=active]:bg-[#3ECF8E]/15 data-[state=active]:text-[#3ECF8E]',
                'data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-[#3ECF8E]/35',
              )}
            >
              <Radio className="h-3.5 w-3.5 opacity-80" />
              Ingestion health
            </TabsTrigger>
            <TabsTrigger
              value="ledger"
              className={cn(
                'gap-1.5 rounded-lg px-3 py-2 text-[12px] data-[state=active]:shadow-none',
                'data-[state=active]:bg-[#3ECF8E]/15 data-[state=active]:text-[#3ECF8E]',
                'data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-[#3ECF8E]/35',
              )}
            >
              <FileStack className="h-3.5 w-3.5 opacity-80" />
              Event ledger
            </TabsTrigger>
            <TabsTrigger
              value="replay"
              className={cn(
                'gap-1.5 rounded-lg px-3 py-2 text-[12px] data-[state=active]:shadow-none',
                'data-[state=active]:bg-[#3ECF8E]/15 data-[state=active]:text-[#3ECF8E]',
                'data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-[#3ECF8E]/35',
              )}
            >
              <PlayCircle className="h-3.5 w-3.5 opacity-80" />
              Replay
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sources" className="mt-0 px-5 pb-5 pt-4 focus-visible:outline-none">
          <ParametricSourceHealth rows={healthRows} variant="embedded" />
        </TabsContent>
        <TabsContent value="ledger" className="mt-0 px-5 pb-5 pt-4 focus-visible:outline-none">
          <ParametricLedgerTable rows={ledgerRows} variant="embedded" />
        </TabsContent>
        <TabsContent value="replay" className="mt-0 px-5 pb-5 pt-4 focus-visible:outline-none">
          <TriggerReplayForm variant="embedded" />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function StatPill({
  label,
  value,
  sub,
  className,
  valueClass,
}: {
  label: string;
  value: number;
  sub?: string;
  className?: string;
  valueClass?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#2d2d2d] bg-[#111111] px-3 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]',
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280]">{label}</p>
      <p className={cn('mt-0.5 text-xl font-bold tabular-nums tracking-tight text-white', valueClass)}>{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-[#525252] truncate" title={sub}>{sub}</p> : null}
    </div>
  );
}
