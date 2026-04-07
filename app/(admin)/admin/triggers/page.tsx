import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
import { TriggersList } from '@/components/admin/TriggersList';
import { TriggerAnalytics } from '@/components/admin/TriggerAnalytics';
import { TriggerTrustConsole } from '@/components/admin/TriggerTrustConsole';
import type { LedgerRow } from '@/components/admin/ParametricLedgerTable';
import type { SourceHealthRow } from '@/components/admin/ParametricSourceHealth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getExpectedParametricSourceIds,
  getPinnedParametricSourceIds,
  shouldKeepSourceHealthRow,
} from '@/lib/adjudicator/source-health-registry';
import { Zap } from 'lucide-react';

export default async function TriggersPage() {
  const supabase = createAdminClient();

  const [eventsRes, ledgerRes, healthRes] = await Promise.all([
    supabase
      .from('live_disruption_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('parametric_trigger_ledger')
      .select(
        'id,created_at,source,trigger_subtype,event_type,outcome,rule_version,rule_set_id,claims_created,payouts_initiated,is_dry_run,error_message,disruption_event_id',
      )
      .order('created_at', { ascending: false })
      .limit(75),
    supabase
      .from('parametric_source_health')
      .select(
        'source_id,last_success_at,last_error_at,last_error_detail,last_observed_at,error_streak,success_streak,avg_latency_ms,last_latency_ms,is_fallback,fallback_of',
      )
      .order('source_id', { ascending: true }),
  ]);

  const events = eventsRes.error ? null : eventsRes.data;
  const ledgerRows = (ledgerRes.error ? [] : ledgerRes.data ?? []) as LedgerRow[];
  const healthRowsRaw = (healthRes.error ? [] : healthRes.data ?? []) as SourceHealthRow[];
  const expectedIds = getExpectedParametricSourceIds();
  const pinnedIds = getPinnedParametricSourceIds();
  const healthRows = healthRowsRaw.filter((r) =>
    shouldKeepSourceHealthRow({
      sourceId: r.source_id,
      lastObservedAt: r.last_observed_at,
      expectedIds,
      pinnedIds,
      keepObservedWithinDays: 30,
    }),
  );

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
      <AdminPageTitle
        title="Trigger Feed"
        help="Live and recent disruption events that the adjudicator ingests (weather, AQI, traffic, news/curfew, etc.). Severity badges summarize the current list. Below: trust console (source health + immutable trigger ledger + replay), analytics for the loaded events, then the full event list."
        description="Parametric events from weather, traffic, and news APIs"
        actions={
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
        }
      />

      <TriggerTrustConsole healthRows={healthRows} ledgerRows={ledgerRows} />

      {/* Analytics charts */}
      {list.length > 0 && <TriggerAnalytics events={list} />}

      <TriggersList events={list} />
    </div>
  );
}
