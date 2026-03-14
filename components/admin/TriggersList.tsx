'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      dot: 'bg-[#a78bfa]',
    };
  if (score >= 5)
    return {
      label: 'Medium',
      badge: 'bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20',
      dot: 'bg-[#7dd3fc]',
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
  const baselineP75 = raw.baseline_p75 as number | undefined;
  const baselineP90 = raw.baseline_p90 as number | undefined;
  const chronic = raw.chronic_pollution as boolean | undefined;
  const excess = raw.excess_percent as number | undefined;
  const days = raw.historical_days as number | undefined;

  if (!current || !threshold) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/15 font-mono tabular-nums">
        AQI {current}
      </span>
      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#262626] text-[#555] border border-[#3a3a3a] font-mono tabular-nums">
        threshold {threshold}
      </span>
      {chronic && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/15">
          chronic zone (p90: {baselineP90})
        </span>
      )}
      {!chronic && baselineP75 != null && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#262626] text-[#555] border border-[#3a3a3a] font-mono tabular-nums">
          p75: {baselineP75}
        </span>
      )}
      {excess != null && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/15">
          +{excess}% above normal
        </span>
      )}
      {days != null && <span className="text-[10px] text-[#555]">{days}-day history</span>}
    </div>
  );
}

function TriggerSubtitle({ raw }: { raw: Record<string, unknown> | null | undefined }) {
  if (!raw) return null;
  const trigger = raw.trigger as string | undefined;
  if (!trigger) return null;

  const labels: Record<string, string> = {
    extreme_heat: 'Extreme heat >= 43C sustained 3h',
    heavy_rain: 'Heavy rain >= 4 mm/h',
    severe_aqi: 'AQI spike. Adaptive threshold breached',
    traffic_gridlock: 'Severe traffic gridlock',
    zone_curfew: 'Zone curfew / strike / lockdown',
  };

  return <p className="text-xs text-[#555] mt-0.5">{labels[trigger] ?? trigger}</p>;
}

export function TriggersList({ events }: { events: Event[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-5 py-14 text-center">
        <Cloud className="h-8 w-8 text-[#3a3a3a] mx-auto mb-3" />
        <p className="text-sm text-[#555]">
          No events yet. Run the adjudicator or wait for the cron.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-[#2d2d2d]">
            <TableHead className="w-[min(280px,35%)]">Event</TableHead>
            <TableHead className="w-[160px]">Zone</TableHead>
            <TableHead className="w-[100px]">Severity</TableHead>
            <TableHead className="w-[72px] text-center">Verified</TableHead>
            <TableHead className="w-[120px] text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => {
            const sev = severityStatus(e.severity_score);
            const sourceLabel = formatSource(e.raw_api_data);
            return (
              <TableRow key={e.id} className="border-[#2d2d2d] align-top">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#555] shrink-0">
                      {typeIcons[e.event_type] ?? <Cloud className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-sm font-medium text-white capitalize">
                      {e.event_type}
                    </span>
                  </div>
                  <TriggerSubtitle raw={e.raw_api_data} />
                  {sourceLabel && (
                    <p className="text-[10px] text-[#444] mt-1">Source: {sourceLabel}</p>
                  )}
                  <AQIBadge raw={e.raw_api_data} />
                </TableCell>

                <TableCell className="text-xs text-[#9ca3af] tabular-nums">
                  {formatZone(e.geofence_polygon)}
                </TableCell>

                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${sev.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sev.dot}`} />
                    {sev.label}
                  </span>
                  <p className="text-[10px] text-[#555] mt-1 tabular-nums">
                    {e.severity_score}/10
                  </p>
                </TableCell>

                <TableCell className="text-center">
                  {e.verified_by_llm ? (
                    <span className="text-[#22c55e] font-semibold text-[10px]">Yes</span>
                  ) : (
                    <span className="text-[#3a3a3a]">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
