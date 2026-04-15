import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
import { DemoTriggerPanel } from '@/components/admin/DemoTriggerPanel';
import { Card } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { inferIndianMetroLabel } from '@/lib/geo/infer-indian-metro-label';
import { createAdminClient } from '@/lib/supabase/admin';
import { FileCheck, ScrollText, Zap } from 'lucide-react';

export default async function AdminDemoPage() {
  const supabase = createAdminClient();

  const [{ data: demoRuns }, { data: riders }] = await Promise.all([
    supabase
      .from('system_logs')
      .select('id, created_at, metadata')
      .eq('event_type', 'adjudicator_demo')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select(
        'id, full_name, phone_number, platform, zone_latitude, zone_longitude, deprovisioned_at',
      )
      .or('role.eq.rider,role.is.null')
      .is('deprovisioned_at', null)
      .order('full_name'),
  ]);

  const riderList = (riders ?? []).map((r) => {
    const lat = r.zone_latitude != null && r.zone_latitude !== '' ? Number(r.zone_latitude) : null;
    const lng =
      r.zone_longitude != null && r.zone_longitude !== '' ? Number(r.zone_longitude) : null;
    const hasZone = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
    return {
      id: r.id,
      full_name: r.full_name ?? 'Unknown',
      phone_number: r.phone_number ?? null,
      platform: r.platform ?? null,
      zone_latitude: hasZone ? lat : null,
      zone_longitude: hasZone ? lng : null,
      zone_label: hasZone ? inferIndianMetroLabel(lat!, lng!) : null,
    };
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const runs = (demoRuns ?? []).map((run) => {
    const meta = (run.metadata ?? {}) as {
      candidates_found?: number;
      claims_created?: number;
      zones_checked?: number;
      duration_ms?: number;
      payouts_initiated?: number;
      error?: string;
      demo_batch?: boolean;
      batch_label?: string | null;
      batch_step_count?: number;
      demo_run_label?: string | null;
      demo_event_subtype?: string | null;
    };
    return { id: run.id, created_at: run.created_at, ...meta };
  });

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageTitle
        title="Demo"
        help="Safe environment to simulate adjudicator runs and synthetic triggers for demos or QA. Picks a rider context and exercises the pipeline without touching production traffic semantics. Recent runs list shows candidates, claims created, and timing from system logs."
        description="Trigger synthetic disruptions and manage demo runs for testing and recordings"
      />

      <DemoTriggerPanel riders={riderList} />

      <Card variant="default" padding="none" className="overflow-hidden">
        <div className="border-b border-[#2d2d2d] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-[#141414]/80">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1e1e1e] border border-[#2d2d2d]">
              <ScrollText className="h-4 w-4 text-[#a78bfa]" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Recent demo runs</p>
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                Last 20 adjudicator_demo entries · refreshes after each trigger
              </p>
            </div>
          </div>
          {runs.length > 0 && (
            <span className="text-[11px] text-[#6b7280] tabular-nums shrink-0 self-start sm:self-auto">
              {runs.length} shown
            </span>
          )}
        </div>
        {runs.length === 0 ? (
          <div className="mx-5 mb-5 mt-2 rounded-xl border border-dashed border-[#333] bg-[#121212]/80 px-6 py-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a1a] border border-[#2d2d2d] mb-4">
              <Zap className="h-6 w-6 text-[#525252]" aria-hidden />
            </div>
            <p className="text-sm font-medium text-[#a3a3a3]">No runs recorded yet</p>
            <p className="text-xs text-[#6b7280] mt-1.5 max-w-sm mx-auto leading-relaxed">
              Use <span className="text-[#9ca3af]">Fire demo</span> or the sequence simulation
              above. Results appear here with labels and timing.
            </p>
          </div>
        ) : (
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                <TableHead className="w-[180px] pl-5">Time</TableHead>
                <TableHead className="min-w-[160px]">Label / type</TableHead>
                <TableHead className="w-[88px] text-center">Candidates</TableHead>
                <TableHead className="w-[88px] text-center">Claims</TableHead>
                <TableHead className="w-[72px] text-center">Payouts</TableHead>
                <TableHead className="w-[72px] text-center">Zones</TableHead>
                <TableHead className="w-[88px] text-right pr-5">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow
                  key={run.id}
                  className="border-[#2d2d2d] hover:bg-white/[0.02] transition-colors"
                >
                  <TableCell className="text-xs text-white tabular-nums whitespace-nowrap pl-5">
                    {formatDate(run.created_at)}
                  </TableCell>
                  <TableCell className="text-xs text-[#c4c4c4] max-w-[240px]">
                    <div className="flex flex-col gap-0.5">
                      {run.demo_batch ? (
                        <span className="inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold bg-violet-500/15 text-violet-200 border border-violet-500/25">
                          Batch
                          {run.batch_step_count != null ? ` · ${run.batch_step_count} steps` : ''}
                        </span>
                      ) : null}
                      <span className="line-clamp-2">
                        {
                          (run.batch_label ||
                            run.demo_run_label ||
                            run.demo_event_subtype ||
                            '—') as string
                        }
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-[#9ca3af] tabular-nums">
                    {run.candidates_found ?? '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 text-xs text-[#22c55e]">
                      <FileCheck className="h-3 w-3 shrink-0" />
                      {run.claims_created ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-[#9ca3af] tabular-nums">
                    {run.payouts_initiated ?? '—'}
                  </TableCell>
                  <TableCell className="text-center text-xs text-[#9ca3af] tabular-nums">
                    {run.zones_checked ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-[#737373] tabular-nums pr-5">
                    {run.duration_ms != null ? `${run.duration_ms}ms` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
