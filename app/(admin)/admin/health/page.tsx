import { SystemHealth } from '@/components/admin/SystemHealth';
import { Card } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createAdminClient } from '@/lib/supabase/admin';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<
  string,
  { badgeClass: string }
> = {
  info: { badgeClass: 'border-[#2d2d2d] bg-[#262626] text-[#666]' },
  warning: {
    badgeClass: 'border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#f59e0b]',
  },
  error: {
    badgeClass: 'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#ef4444]',
  },
};

function formatLogTime(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDetails(metadata: Record<string, unknown>): string {
  if (metadata?.claims_created != null && metadata?.duration_ms != null) {
    return `${metadata.claims_created} claims · ${metadata.duration_ms}ms`;
  }
  if (metadata?.action) {
    return `${metadata.action} by ${metadata.reviewed_by ?? 'admin'}`;
  }
  if (metadata?.error) {
    return String(metadata.error).slice(0, 60);
  }
  return '—';
}

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          System Health
        </h1>
        <p className="text-sm text-[#666] mt-1">
          API status, adjudicator run history, and platform event log
        </p>
      </div>

      <SystemHealth />

      <Card variant="default" padding="none">
        <div className="border-b border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Event Log</p>
          {recentLogs.length > 0 && (
            <span className="text-[11px] text-[#555] tabular-nums">
              {recentLogs.length} events
            </span>
          )}
        </div>
        {recentLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <ClipboardList className="h-10 w-10 text-[#3a3a3a] mb-4" />
            <p className="text-sm font-medium text-[#555]">
              No events logged yet
            </p>
            <p className="text-xs text-[#444] mt-1">
              Run the adjudicator to start recording runs and events
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[420px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                  <TableHead className="w-[90px]">Severity</TableHead>
                  <TableHead className="w-[140px]">Event</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[120px] text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => {
                  const sev =
                    SEVERITY_STYLES[log.severity] ?? SEVERITY_STYLES.info;
                  return (
                    <TableRow key={log.id} className="border-[#2d2d2d]">
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'rounded-full text-[10px] font-semibold px-2 py-0 border',
                            sev.badgeClass,
                          )}
                        >
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#9ca3af]">
                        {log.event_type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-xs text-[#555] truncate max-w-[220px]">
                        {formatDetails(log.metadata)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#555] tabular-nums">
                        {formatLogTime(log.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
