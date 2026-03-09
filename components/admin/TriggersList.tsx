'use client';

import { motion } from 'framer-motion';
import { Car, Cloud, Megaphone } from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  weather: <Cloud className="h-3.5 w-3.5" />,
  traffic: <Car className="h-3.5 w-3.5" />,
  social: <Megaphone className="h-3.5 w-3.5" />,
};

interface Event {
  id: string;
  event_type: string;
  severity_score: number;
  verified_by_llm?: boolean;
  geofence_polygon?: Record<string, unknown> | null;
  raw_api_data?: Record<string, unknown> | null;
  created_at: string;
}

function formatZone(geofence: Record<string, unknown> | null | undefined) {
  const lat = typeof geofence?.lat === 'number' ? geofence.lat : null;
  const lng = typeof geofence?.lng === 'number' ? geofence.lng : null;
  const radiusKm = typeof geofence?.radius_km === 'number' ? geofence.radius_km : null;

  if (lat == null || lng == null) return 'Zone unavailable';

  const coords = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  return radiusKm != null ? `${coords} · ${radiusKm} km` : coords;
}

function formatSource(raw: Record<string, unknown> | null | undefined) {
  const source = typeof raw?.source === 'string' ? raw.source : null;
  if (!source) return null;

  return source.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function severityStatus(score: number): { label: string; badge: string; dot: string } {
  if (score >= 8)
    return {
      label: 'High',
      badge: 'bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20',
      dot: 'bg-[#a78bfa] animate-violet-pulse',
    };
  if (score >= 5)
    return {
      label: 'Medium',
      badge: 'bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20',
      dot: 'bg-[#7dd3fc] animate-neon-pulse',
    };
  return {
    label: 'Low',
    badge: 'bg-[#262626] text-[#737373] border border-[#3a3a3a]',
    dot: 'bg-[#737373]',
  };
}

function AQIBadge({ raw }: { raw: Record<string, unknown> | null | undefined }) {
  if (!raw || raw.trigger !== 'severe_aqi') return null;

  const current = raw.current_aqi as number | undefined;
  const threshold = raw.adaptive_threshold as number | undefined;
  const baseline = raw.baseline_p75 as number | undefined;
  const excess = raw.excess_percent as number | undefined;
  const days = raw.historical_days as number | undefined;

  if (!current || !threshold) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/15 font-mono tabular-nums">
        AQI {current}
      </span>
      {threshold && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#262626] text-[#666666] border border-[#3a3a3a] font-mono tabular-nums">
          threshold {threshold}
        </span>
      )}
      {baseline != null && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#262626] text-[#666666] border border-[#3a3a3a] font-mono tabular-nums">
          p75 baseline {baseline}
        </span>
      )}
      {excess != null && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/15">
          +{excess}% above normal
        </span>
      )}
      {days != null && <span className="text-[10px] text-[#666666]">{days}-day history</span>}
    </div>
  );
}

function TriggerSubtitle({ raw }: { raw: Record<string, unknown> | null | undefined }) {
  if (!raw) return null;
  const trigger = raw.trigger as string | undefined;
  if (!trigger) return null;

  const labels: Record<string, string> = {
    extreme_heat: 'Extreme heat ≥ 43°C sustained 3h',
    heavy_rain: 'Heavy rain ≥ 4 mm/h',
    severe_aqi: 'AQI spike. Adaptive threshold breached',
    traffic_gridlock: 'Severe traffic gridlock',
    zone_curfew: 'Zone curfew / strike / lockdown',
  };

  return <p className="text-xs text-[#666666] mt-0.5">{labels[trigger] ?? trigger}</p>;
}

export function TriggersList({ events }: { events: Event[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl px-5 py-14 text-center shadow-[0_0_20px_rgba(255,255,255,0.03)]">
        <Cloud className="h-8 w-8 text-[#3a3a3a] mx-auto mb-3" />
        <p className="text-sm text-[#666666]">
          No events yet. Run the adjudicator or wait for the cron.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.03)]">
      {/* Column headers */}
      <div className="px-5 py-3 border-b border-[#2d2d2d] grid grid-cols-[1fr_auto_auto_auto_auto] gap-4">
        {['Event', 'Zone', 'Severity', 'Verified', 'Time'].map((h) => (
          <span
            key={h}
            className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em]"
          >
            {h}
          </span>
        ))}
      </div>

      <div className="divide-y divide-[#2d2d2d]">
        {events.map((e, i) => {
          const sev = severityStatus(e.severity_score);
          const sourceLabel = formatSource(e.raw_api_data);
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="px-5 py-4 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-start hover:bg-[#1e1e1e] transition-colors"
            >
              {/* Event */}
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[#666666] shrink-0">
                    {typeIcons[e.event_type] ?? <Cloud className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-sm font-medium text-white capitalize">{e.event_type}</span>
                </div>
                <TriggerSubtitle raw={e.raw_api_data} />
                {sourceLabel && <p className="text-[10px] text-[#3a3a3a] mt-1">Source: {sourceLabel}</p>}
                <AQIBadge raw={e.raw_api_data} />
              </div>

              {/* Zone */}
              <span className="text-xs text-[#666666] mt-0.5 max-w-[160px] leading-relaxed">
                {formatZone(e.geofence_polygon)}
              </span>

              {/* Severity badge */}
              <div className="mt-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${sev.badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sev.dot}`} />
                  {sev.label}
                </span>
                <p className="text-[10px] text-[#666666] mt-1 tabular-nums">
                  {e.severity_score}/10
                </p>
              </div>

              {/* Verified */}
              <span className="text-xs mt-0.5">
                {e.verified_by_llm ? (
                  <span className="text-[#22c55e] font-semibold text-[10px]">Yes</span>
                ) : (
                  <span className="text-[#3a3a3a]">—</span>
                )}
              </span>

              {/* Time */}
              <span className="text-xs text-[#666666] tabular-nums mt-0.5 whitespace-nowrap">
                {new Date(e.created_at).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
