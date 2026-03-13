import { TriggersList } from '@/components/admin/TriggersList';
import { createAdminClient } from '@/lib/supabase/admin';
import { Zap } from 'lucide-react';

export default async function TriggersPage() {
  const supabase = createAdminClient();

  const { data: events } = await supabase
    .from('live_disruption_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  const highCount = events?.filter((e) => e.severity_score >= 8).length ?? 0;
  const medCount = events?.filter((e) => e.severity_score >= 5 && e.severity_score < 8).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Trigger Feed</h1>
          <p className="text-sm text-[#666] mt-1">
            Parametric events from weather, traffic, and news APIs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a78bfa]" />
              {highCount} High
            </span>
          )}
          {medCount > 0 && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7dd3fc]" />
              {medCount} Medium
            </span>
          )}
          {(!events || events.length === 0) && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#262626] text-[#555] border border-[#3a3a3a] flex items-center gap-1.5">
              <Zap className="h-3 w-3" />
              No events
            </span>
          )}
        </div>
      </div>

      <TriggersList events={events ?? []} />
    </div>
  );
}
