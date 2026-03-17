import { TriggersList } from '@/components/admin/TriggersList';
import { TriggerAnalytics } from '@/components/admin/TriggerAnalytics';
import { createAdminClient } from '@/lib/supabase/admin';
import { Zap } from 'lucide-react';

export default async function TriggersPage() {
  const supabase = createAdminClient();

  const { data: events } = await supabase
    .from('live_disruption_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const list = events ?? [];
  const total = list.length;
  const highCount = list.filter((e) => e.severity_score >= 8).length;
  const medCount = list.filter((e) => e.severity_score >= 5 && e.severity_score < 8).length;

  const zones = list.map((e) => {
    const gf = e.geofence_polygon as { lat?: number; lng?: number; radius_km?: number } | null;
    const lat = typeof gf?.lat === 'number' ? gf.lat.toFixed(2) : null;
    const lng = typeof gf?.lng === 'number' ? gf.lng.toFixed(2) : null;
    const radius = typeof gf?.radius_km === 'number' ? gf.radius_km : null;
    if (!lat || !lng) return null;
    const key = `${lat},${lng}${radius != null ? `_${radius}` : ''}`;
    return key;
  }).filter(Boolean) as string[];

  const zoneCounts = zones.reduce<Record<string, number>>((acc, key) => {
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

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

      {/* Analytics charts */}
      {list.length > 0 && <TriggerAnalytics events={list} />}

      <TriggersList events={list} />
    </div>
  );
}
