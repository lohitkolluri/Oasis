"use client";

import { Cloud, Car, Megaphone } from "lucide-react";

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
  raw_api_data?: Record<string, unknown> | null;
  created_at: string;
}

function AQIBadge({ raw }: { raw: Record<string, unknown> | null | undefined }) {
  if (!raw || raw.trigger !== "severe_aqi") return null;

  const current = raw.current_aqi as number | undefined;
  const threshold = raw.adaptive_threshold as number | undefined;
  const baseline = raw.baseline_p75 as number | undefined;
  const excess = raw.excess_percent as number | undefined;
  const days = raw.historical_days as number | undefined;

  if (!current || !threshold) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/15 font-mono tabular-nums">
        AQI {current}
      </span>
      {threshold && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 font-mono tabular-nums">
          threshold {threshold}
        </span>
      )}
      {baseline != null && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 font-mono tabular-nums">
          p75 baseline {baseline}
        </span>
      )}
      {excess != null && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15">
          +{excess}% above normal
        </span>
      )}
      {days != null && (
        <span className="text-[10px] text-zinc-600">{days}-day history</span>
      )}
    </div>
  );
}

function TriggerSubtitle({ raw }: { raw: Record<string, unknown> | null | undefined }) {
  if (!raw) return null;
  const trigger = raw.trigger as string | undefined;
  if (!trigger) return null;

  const labels: Record<string, string> = {
    extreme_heat: "Extreme heat ≥ 43°C sustained 3h",
    heavy_rain: "Heavy rain ≥ 4 mm/h",
    severe_aqi: "AQI spike — adaptive threshold breached",
    traffic_gridlock: "Severe traffic gridlock",
    zone_curfew: "Zone curfew / strike / lockdown",
  };

  return (
    <p className="text-xs text-zinc-600 mt-0.5">{labels[trigger] ?? trigger}</p>
  );
}

export function TriggersList({ events }: { events: Event[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-12 text-center">
        <p className="text-sm text-zinc-600">
          No events yet — run the adjudicator or wait for the cron.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-800 grid grid-cols-[1fr_auto_auto_auto] gap-4">
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
          Event
        </span>
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
          Severity
        </span>
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
          Verified
        </span>
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
          Time
        </span>
      </div>
      <div className="divide-y divide-zinc-800/70">
        {events.map((e) => (
          <div
            key={e.id}
            className="px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-start"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-zinc-600 shrink-0">
                  {typeIcons[e.event_type] ?? <Cloud className="h-3.5 w-3.5" />}
                </span>
                <span className="text-sm text-zinc-300 capitalize">{e.event_type}</span>
              </div>
              <TriggerSubtitle raw={e.raw_api_data} />
              <AQIBadge raw={e.raw_api_data} />
            </div>
            <span
              className={`text-sm font-semibold tabular-nums mt-0.5 ${
                e.severity_score >= 8 ? "text-red-400" : "text-amber-400"
              }`}
            >
              {e.severity_score}/10
            </span>
            <span className="text-xs mt-0.5">
              {e.verified_by_llm ? (
                <span className="text-emerald-400 font-medium">Yes</span>
              ) : (
                <span className="text-zinc-600">—</span>
              )}
            </span>
            <span className="text-xs text-zinc-600 tabular-nums mt-0.5">
              {new Date(e.created_at).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
