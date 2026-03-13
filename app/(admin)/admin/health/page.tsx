import { SystemHealth } from '@/components/admin/SystemHealth';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function HealthPage() {
  const supabase = createAdminClient();

  let recentLogs: Array<{
    id: string;
    event_type: string;
    severity: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }> = [];
  try {
    const { data } = await supabase
      .from('system_logs')
      .select('id, event_type, severity, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    recentLogs = (data ?? []) as typeof recentLogs;
  } catch {
    // Table may not exist yet
  }

  const SEVERITY_STYLES: Record<string, { badge: string }> = {
    info: { badge: 'bg-[#262626] text-[#666]' },
    warning: { badge: 'bg-[#f59e0b]/10 text-[#f59e0b]' },
    error: { badge: 'bg-[#ef4444]/10 text-[#ef4444]' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">System Health</h1>
        <p className="text-sm text-[#666] mt-1">
          API status, adjudicator run history, and platform event log
        </p>
      </div>

      <SystemHealth />

      {/* Full log table */}
      <div>
        <p className="text-[10px] font-medium text-[#555] uppercase tracking-[0.1em] mb-3">
          Event Log
        </p>
        {recentLogs.length === 0 ? (
          <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-5 py-12 text-center">
            <p className="text-sm text-[#555]">
              No events logged yet. Run the adjudicator to start
            </p>
          </div>
        ) : (
          <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl overflow-hidden">
            <div className="px-5 py-2.5 border-b border-[#2d2d2d] grid grid-cols-[auto_1fr_auto_auto] gap-4">
              {['Severity', 'Event', 'Details', 'Time'].map((h) => (
                <span
                  key={h}
                  className="text-[10px] font-medium text-[#555] uppercase tracking-[0.1em]"
                >
                  {h}
                </span>
              ))}
            </div>
            <div className="divide-y divide-[#2d2d2d] max-h-[500px] overflow-y-auto">
              {recentLogs.map((log) => {
                const sev = SEVERITY_STYLES[log.severity] ?? SEVERITY_STYLES.info;
                return (
                  <div
                    key={log.id}
                    className="px-5 py-2.5 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center text-xs hover:bg-[#1e1e1e] transition-colors"
                  >
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sev.badge}`}
                    >
                      {log.severity}
                    </span>
                    <span className="text-[#9ca3af] truncate">
                      {log.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[#555] truncate max-w-[200px]">
                      {log.metadata?.claims_created != null
                        ? `${log.metadata.claims_created} claims · ${log.metadata.duration_ms}ms`
                        : log.metadata?.action
                          ? `${log.metadata.action} by ${log.metadata.reviewed_by ?? 'admin'}`
                          : log.metadata?.error
                            ? String(log.metadata.error).slice(0, 40)
                            : '—'}
                    </span>
                    <span className="text-[#444] shrink-0 tabular-nums">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
