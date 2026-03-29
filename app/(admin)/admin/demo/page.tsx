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
import { createAdminClient } from '@/lib/supabase/admin';
import { FileCheck, Zap } from 'lucide-react';

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
      .select('id, full_name, phone_number, platform')
      .or('role.eq.rider,role.is.null')
      .order('full_name'),
  ]);

  const riderList = (riders ?? []).map((r) => ({
    id: r.id,
    full_name: r.full_name ?? 'Unknown',
    phone_number: r.phone_number ?? null,
    platform: r.platform ?? null,
  }));

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
      error?: string;
    };
    return { id: run.id, created_at: run.created_at, ...meta };
  });

  return (
    <div className="space-y-6">
      <AdminPageTitle
        title="Demo"
        help="Safe environment to simulate adjudicator runs and synthetic triggers for demos or QA. Picks a rider context and exercises the pipeline without touching production traffic semantics. Recent runs list shows candidates, claims created, and timing from system logs."
        description="Trigger synthetic disruptions and manage demo runs for testing and recordings"
      />

      <DemoTriggerPanel riders={riderList} />

      <Card variant="default" padding="none">
        <div className="border-b border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Recent Demo Runs</p>
          {runs.length > 0 && (
            <span className="text-[11px] text-[#555] tabular-nums">
              {runs.length} runs
            </span>
          )}
        </div>
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <Zap className="h-10 w-10 text-[#3a3a3a] mb-4" />
            <p className="text-sm font-medium text-[#555]">No demo runs yet</p>
            <p className="text-xs text-[#444] mt-1">
              Fire a demo above to see runs here
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                <TableHead className="w-[180px]">Time</TableHead>
                <TableHead className="w-[90px] text-center">
                  Candidates
                </TableHead>
                <TableHead className="w-[90px] text-center">Claims</TableHead>
                <TableHead className="w-[80px] text-center">Zones</TableHead>
                <TableHead className="w-[90px] text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id} className="border-[#2d2d2d]">
                  <TableCell className="text-xs text-white tabular-nums whitespace-nowrap">
                    {formatDate(run.created_at)}
                  </TableCell>
                  <TableCell className="text-center text-xs text-[#9ca3af] tabular-nums">
                    {run.candidates_found ?? '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#22c55e]">
                      <FileCheck className="h-3 w-3" />
                      {run.claims_created ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-[#9ca3af] tabular-nums">
                    {run.zones_checked ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-[#555] tabular-nums">
                    {run.duration_ms != null
                      ? `${run.duration_ms}ms`
                      : '—'}
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
