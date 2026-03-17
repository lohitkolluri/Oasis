import { SystemLogsTable } from '@/components/admin/SystemLogsTable';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
export default async function SystemLogsPage() {
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
      .limit(200);
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
          Detailed event history for adjudicator runs and platform activity.
        </p>
      </div>

      <Card variant="default" padding="none">
        <SystemLogsTable logs={recentLogs} />
      </Card>
    </div>
  );
}

