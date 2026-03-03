"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Cloud, Car, Megaphone } from "lucide-react";

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
    <div className="rounded-2xl bg-zinc-900/90 border border-zinc-700/40 shadow-xl shadow-black/10 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
          <MapPin className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-zinc-100">Risk Radar</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Active disruptions · Payouts auto-trigger when affected
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Live
        </span>
      </div>
      {events.length === 0 ? (
        <div className="mt-4 py-8 text-center">
          <p className="text-sm text-zinc-500">No active disruptions</p>
          <p className="text-xs text-zinc-600 mt-1">You're all clear</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-xl bg-zinc-800/50 px-4 py-3 text-sm"
            >
              <span className="text-amber-400">
                {typeIcons[e.event_type] ?? <MapPin className="h-4 w-4" />}
              </span>
              <span className="capitalize text-zinc-300 font-medium">
                {typeLabels[e.event_type] ?? e.event_type}
              </span>
              <span
                className={`ml-auto font-medium tabular-nums ${
                  e.severity_score >= 8 ? "text-red-400" : "text-amber-400"
                }`}
              >
                {e.severity_score}/10
              </span>
              <span className="text-zinc-500 text-xs tabular-nums">
                {new Date(e.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
