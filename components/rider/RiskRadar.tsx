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
    <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/80 border border-zinc-700/50 p-6 shadow-xl shadow-black/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-amber-500/10">
          <MapPin className="h-5 w-5 text-amber-400" />
        </div>
        <h2 className="font-semibold">Risk Radar</h2>
        <span className="ml-auto text-xs text-amber-400/80">Live</span>
      </div>
      <p className="text-sm text-zinc-400 mb-4">
        Active disruptions in your area. Payouts auto-trigger when you’re
        affected.
      </p>
      {events.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">No active disruptions</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-2 text-sm"
            >
              <span className="text-amber-400">{typeIcons[e.event_type] ?? <MapPin className="h-4 w-4" />}</span>
              <span className="capitalize">{typeLabels[e.event_type] ?? e.event_type}</span>
              <span
                className={`ml-auto font-medium ${
                  e.severity_score >= 8 ? "text-red-400" : "text-amber-400"
                }`}
              >
                Severity {e.severity_score}/10
              </span>
              <span className="text-zinc-500 text-xs">
                {new Date(e.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
