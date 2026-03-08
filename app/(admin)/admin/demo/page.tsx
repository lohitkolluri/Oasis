import { DemoTriggerPanel } from '@/components/admin/DemoTriggerPanel';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft, Clock, FileCheck, FlaskConical, Zap } from 'lucide-react';
import Link from 'next/link';

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

  return (
    <div className="space-y-8 py-2">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-white transition-colors group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </Link>

      <div>
        <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.15em] mb-1">Admin Console</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center">
            <FlaskConical className="h-4 w-4 text-[#a78bfa]" />
          </div>
          Demo
        </h1>
        <p className="text-sm text-[#666666] mt-1">
          Trigger synthetic disruptions and manage demo runs for testing and recordings
        </p>
      </div>

      <DemoTriggerPanel riders={riderList} />

      {/* Recent demo runs */}
      <div>
        <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em] mb-4 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Recent Demo Runs
        </p>

        <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl overflow-hidden">
          {demoRuns && demoRuns.length > 0 ? (
            <>
              {/* Header */}
              <div className="px-5 py-3 border-b border-[#2d2d2d] grid grid-cols-[1fr_auto_auto_auto_auto] gap-4">
                {['Time', 'Candidates', 'Claims', 'Zones', 'Duration'].map((h) => (
                  <span key={h} className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em]">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-[#2d2d2d]">
                {demoRuns.map((run) => {
                  const meta = (run.metadata ?? {}) as {
                    candidates_found?: number;
                    claims_created?: number;
                    zones_checked?: number;
                    duration_ms?: number;
                    error?: string;
                  };
                  return (
                    <div
                      key={run.id}
                      className="px-5 py-3.5 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center hover:bg-[#1e1e1e] transition-colors"
                    >
                      <span className="text-xs text-white whitespace-nowrap tabular-nums">{formatDate(run.created_at)}</span>
                      <span className="text-xs text-[#9ca3af] text-center">{meta.candidates_found ?? '—'}</span>
                      <span className="inline-flex items-center gap-1.5 text-[#22c55e] text-xs">
                        <FileCheck className="h-3 w-3" />
                        {meta.claims_created ?? '—'}
                      </span>
                      <span className="text-xs text-[#9ca3af] text-center">{meta.zones_checked ?? '—'}</span>
                      <span className="text-xs text-[#666666] tabular-nums">
                        {meta.duration_ms != null ? `${meta.duration_ms}ms` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-14 px-4 text-center">
              <Zap className="h-8 w-8 text-[#3a3a3a] mx-auto mb-3" />
              <p className="text-sm text-[#666666]">No demo runs yet</p>
              <p className="text-xs text-[#3a3a3a] mt-1">Fire a demo above to see runs here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
