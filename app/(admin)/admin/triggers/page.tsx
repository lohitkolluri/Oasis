import { TriggersList } from '@/components/admin/TriggersList';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';

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
    <div className="space-y-8 py-2">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-white transition-colors group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.15em] mb-1">Admin Console</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Live Trigger Feed</h1>
          <p className="text-sm text-[#666666] mt-1">
            Parametric events from weather, traffic, and news APIs
          </p>
        </div>

        {/* Status summary */}
        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <span className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a78bfa] animate-violet-pulse" />
              {highCount} High
            </span>
          )}
          {medCount > 0 && (
            <span className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7dd3fc] animate-neon-pulse" />
              {medCount} Medium
            </span>
          )}
          {(!events || events.length === 0) && (
            <span className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-[#262626] text-[#666666] border border-[#3a3a3a] flex items-center gap-1.5">
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
