'use client';

import { G } from '@/components/admin/governance-styles';
import { RuleSetInteractiveForm } from '@/components/admin/RuleSetInteractiveForm';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { CopyableId } from '@/components/ui/CopyableId';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  auditActionTitle,
  auditDetailLines,
  auditSearchBlob,
} from '@/lib/admin/audit-display';
import { effectiveStartCaption, formatEffectiveStartLine } from '@/lib/parametric-rules/format-display';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Activity, BookOpen, Gavel, History, Layers, Search, Shield } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type GovernanceRuleRow = {
  id: string;
  version_label: string;
  effective_from: string;
  effective_until: string | null;
  excluded_subtypes: string[] | null;
  notes: string | null;
  created_at: string;
};

export type GovernanceAuditRow = {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
};

type Props = {
  initialRules: GovernanceRuleRow[];
  initialAudits: GovernanceAuditRow[];
};

export function GovernanceDashboard({ initialRules, initialAudits }: Props) {
  const [rules, setRules] = useState(initialRules);
  const [audits, setAudits] = useState(initialAudits);
  const [loading, setLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  const refresh = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        supabase
          .from('parametric_rule_sets')
          .select(
            'id,version_label,effective_from,effective_until,excluded_subtypes,notes,created_at',
          )
          .order('effective_from', { ascending: false })
          .limit(30),
        supabase
          .from('admin_audit_log')
          .select('id,created_at,actor_email,action,resource_type,resource_id,metadata')
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      if (!r.error && r.data) setRules(r.data as GovernanceRuleRow[]);
      if (!a.error && a.data) setAudits(a.data as GovernanceAuditRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('governance_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parametric_rule_sets' },
        () => {
          void refresh();
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_audit_log' },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const current = rules.find((r) => r.effective_until == null);
  const anchorHint = current ? effectiveStartCaption(current.effective_from) : null;

  const auditQuery = auditSearch.trim().toLowerCase();
  const filteredAudits = useMemo(() => {
    if (!auditQuery) return audits;
    return audits.filter((a) => auditSearchBlob(a).includes(auditQuery));
  }, [audits, auditQuery]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Governance</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/45">
          Rule versions in Postgres drive adjudication. Ledger and disruption rows store which version
          applied at event time.
        </p>
      </header>

      {current ? (
        <div className={cn(G.summaryPanel, 'p-5')}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className={G.iconTileLg}>
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className={G.eyebrow}>Active rule set</p>
                  <p className="mt-0.5 font-mono text-xl font-semibold tracking-tight text-white">
                    {current.version_label}
                  </p>
                </div>
                <dl className="grid gap-2 text-[13px] sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-x-8 sm:gap-y-1.5">
                  <dt className="text-white/40">In effect since</dt>
                  <dd className="font-medium text-white/85">{formatEffectiveStartLine(current.effective_from)}</dd>
                  <dt className="text-white/40">Status</dt>
                  <dd className="text-white/85">Current — no end date</dd>
                </dl>
                {anchorHint ? (
                  <p className={cn(G.helper, 'max-w-xl text-[12px]')}>{anchorHint}</p>
                ) : null}
              </div>
            </div>
            {current.excluded_subtypes && current.excluded_subtypes.length > 0 ? (
              <div className="sm:max-w-xs sm:text-right">
                <p className={G.eyebrow}>Excluded triggers</p>
                <div className="mt-2 flex flex-wrap gap-1.5 sm:justify-end">
                  {current.excluded_subtypes.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="border-amber-500/25 bg-amber-500/[0.08] text-[10px] font-normal text-amber-100/90"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="create" className="w-full">
        <TabsList
          className={cn(
            G.panel,
            'h-auto w-full flex-wrap justify-start gap-1 p-1.5 sm:w-auto',
          )}
        >
          <TabsTrigger
            value="create"
            className="gap-2 data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white"
          >
            <Gavel className="h-3.5 w-3.5 opacity-70" />
            New rule set
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="gap-2 data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white"
          >
            <History className="h-3.5 w-3.5 opacity-70" />
            Versions
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="gap-2 data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white"
          >
            <Shield className="h-3.5 w-3.5 opacity-70" />
            Audit log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6 outline-none">
          <Card variant="default" padding="lg" className={G.contentCard}>
            <CardHeader
              icon={
                <div className={G.iconTile}>
                  <BookOpen className="h-4 w-4" />
                </div>
              }
              title="Interactive builder"
              description="Step through version, thresholds, payout ladder, and exclusions. Preview updates as you edit."
            />
            <RuleSetInteractiveForm onPublished={() => void refresh()} />
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6 outline-none">
          <Card variant="default" padding="lg" className={G.contentCard}>
            <CardHeader
              icon={
                <div className={G.iconTile}>
                  <Activity className="h-4 w-4" />
                </div>
              }
              title="Rule set history"
              description="Each version is immutable. The row with no end date is the one in use."
            />
            {loading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-10 w-full bg-white/5" />
                <Skeleton className="h-10 w-full bg-white/5" />
                <Skeleton className="h-10 w-full bg-white/5" />
              </div>
            ) : (
              <ScrollArea className={G.tableShell}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                      <TableHead className={G.th}>Version</TableHead>
                      <TableHead className={G.th}>Valid from</TableHead>
                      <TableHead className={G.th}>Valid until</TableHead>
                      <TableHead className={G.th}>Exclusions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className={cn(G.td, 'text-white/35')}>
                          No rows. Run migrations or publish a rule set.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rules.map((r) => (
                        <TableRow key={r.id} className="border-[#2a2a2a]">
                          <TableCell className={cn(G.td, 'font-mono text-xs text-white/85')}>
                            {r.version_label}
                            {!r.effective_until ? (
                              <Badge
                                variant="outline"
                                className="ml-2 border-white/15 bg-white/[0.04] text-[9px] font-normal text-white/55"
                              >
                                current
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className={cn(G.td, 'text-[11px]')}>
                            {formatEffectiveStartLine(r.effective_from)}
                          </TableCell>
                          <TableCell className={cn(G.td, 'text-[11px]')}>
                            {r.effective_until ? formatEffectiveStartLine(r.effective_until) : '—'}
                          </TableCell>
                          <TableCell className={cn(G.td, 'max-w-[220px] text-xs')}>
                            {(r.excluded_subtypes ?? []).length
                              ? (r.excluded_subtypes as string[]).join(', ')
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6 outline-none">
          <Card variant="default" padding="lg" className={G.contentCard}>
            <CardHeader
              icon={
                <div className={G.iconTile}>
                  <Shield className="h-4 w-4" />
                </div>
              }
              title="Admin audit log"
              description="Append-only trail: claim reviews, policy edits, roles, and rule publishes."
            />
            {loading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-10 w-full bg-white/5" />
                <Skeleton className="h-10 w-full bg-white/5" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative max-w-md flex-1">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30"
                      aria-hidden
                    />
                    <Input
                      type="search"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Search actor, action, resource, details…"
                      className={cn(
                        G.input,
                        'h-9 pl-8 text-sm text-white placeholder:text-white/25',
                      )}
                      aria-label="Filter audit log"
                    />
                  </div>
                  <p className="text-[11px] text-white/35 tabular-nums">
                    {auditQuery
                      ? `${filteredAudits.length} of ${audits.length} shown`
                      : `${audits.length} entries`}
                  </p>
                </div>
                <ScrollArea className={G.tableShell}>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                        <TableHead className={cn(G.th, 'w-[108px]')}>When</TableHead>
                        <TableHead className={cn(G.th, 'min-w-[140px] max-w-[200px]')}>Actor</TableHead>
                        <TableHead className={cn(G.th, 'min-w-[120px]')}>Event</TableHead>
                        <TableHead className={G.th}>Details</TableHead>
                        <TableHead className={cn(G.th, 'min-w-[160px] max-w-[220px]')}>Resource</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className={cn(G.td, 'text-white/35')}>
                            No entries yet.
                          </TableCell>
                        </TableRow>
                      ) : filteredAudits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className={cn(G.td, 'text-white/35')}>
                            No entries match your search.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAudits.map((a) => {
                          const d = new Date(a.created_at);
                          const details = auditDetailLines(a);
                          return (
                            <TableRow key={a.id} className="border-[#2a2a2a]">
                              <TableCell className={cn(G.td, 'whitespace-nowrap align-top text-[11px]')}>
                                <span className="block text-white/70">{d.toLocaleDateString()}</span>
                                <span className="block text-white/40">{d.toLocaleTimeString()}</span>
                              </TableCell>
                              <TableCell
                                className={cn(G.td, 'max-w-[200px] align-top text-xs text-white/60')}
                              >
                                <span className="break-all">{a.actor_email ?? '—'}</span>
                              </TableCell>
                              <TableCell className={cn(G.td, 'align-top')}>
                                <span className="block text-[12px] font-medium leading-snug text-white/88">
                                  {auditActionTitle(a.action)}
                                </span>
                                <span className="mt-0.5 block font-mono text-[10px] leading-snug text-white/35">
                                  {a.action}
                                </span>
                              </TableCell>
                              <TableCell className={cn(G.td, 'max-w-[min(420px,40vw)] align-top')}>
                                <ul className="list-inside list-disc space-y-0.5 text-[11px] leading-relaxed text-white/50">
                                  {details.map((line, i) => (
                                    <li key={i} className="break-words">
                                      {line}
                                    </li>
                                  ))}
                                </ul>
                              </TableCell>
                              <TableCell className={cn(G.td, 'align-top')}>
                                <span className="block text-[11px] text-white/55">{a.resource_type}</span>
                                {a.resource_id ? (
                                  <div className="mt-1">
                                    <CopyableId
                                      value={a.resource_id}
                                      prefix=""
                                      length={10}
                                      label="Copy resource id"
                                      className="text-white/45 hover:text-white/80"
                                    />
                                  </div>
                                ) : (
                                  <span className="mt-1 block text-[11px] text-white/25">No id</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
