"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity, MapPin, Cloud, Car, Megaphone } from "lucide-react";

interface DisruptionEvent {
  id: string;
  event_type: string;
  severity_score: number;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  weather: "Weather",
  traffic: "Traffic",
  social: "Social",
};

const typeIcons: Record<string, React.ReactNode> = {
  weather: <Cloud className="h-4 w-4" />,
  traffic: <Car className="h-4 w-4" />,
  social: <Megaphone className="h-4 w-4" />,
};

export function RiskRadar() {
  const [events, setEvents] = useState<DisruptionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("live_disruption_events")
        .select("id, event_type, severity_score, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setEvents((data as DisruptionEvent[]) ?? []);
      setLoading(false);
    };

    fetchEvents();

    const channel = supabase
      .channel("risk_radar")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_disruption_events",
        },
        (payload) => {
          const newEvent = payload.new as DisruptionEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading && events.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
            Risk Radar
          </span>
          <span className="text-[11px] text-zinc-700">· payouts auto-trigger</span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/15">
          <Activity className="h-3 w-3" />
          Live
        </span>
      </div>
      {events.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-zinc-600">No active disruptions</p>
          <p className="text-xs text-zinc-700 mt-1">You&apos;re all clear</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/80">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-zinc-600 shrink-0">
                {typeIcons[e.event_type] ?? <MapPin className="h-3.5 w-3.5" />}
              </span>
              <span className="text-sm text-zinc-300 capitalize flex-1">
                {typeLabels[e.event_type] ?? e.event_type}
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  e.severity_score >= 8 ? "text-red-400" : "text-amber-400"
                }`}
              >
                {e.severity_score}/10
              </span>
              <span className="text-xs text-zinc-600 tabular-nums w-12 text-right">
                {new Date(e.created_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
