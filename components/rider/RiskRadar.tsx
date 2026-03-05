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
  weather: <Cloud style={{ width: 15, height: 15 }} />,
  traffic: <Car style={{ width: 15, height: 15 }} />,
  social: <Megaphone style={{ width: 15, height: 15 }} />,
};

function SeverityBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 8 ? "bg-red-400" : score >= 6 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-[#1e2535] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-[11px] font-bold tabular-nums ${
          score >= 8 ? "text-red-400" : score >= 6 ? "text-amber-400" : "text-emerald-400"
        }`}
      >
        {score}/10
      </span>
    </div>
  );
}

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

  if (loading && events.length === 0) return null;

  return (
    <div className="rounded-[24px] bg-[#111820] border border-[#1e2535]/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-amber-500/12">
            <Activity className="text-amber-400" style={{ width: 16, height: 16 }} />
          </div>
          <p className="text-[13px] font-semibold text-zinc-200">Risk Radar</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          Live
        </span>
      </div>

      {events.length === 0 ? (
        <div className="px-5 pb-6 pt-2 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/8 mx-auto mb-3">
            <Activity className="text-emerald-400/50" style={{ width: 20, height: 20 }} />
          </div>
          <p className="text-[13px] font-medium text-zinc-400">All clear</p>
          <p className="text-[11px] text-[#606880] mt-0.5">No active disruptions in your area</p>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-[14px] bg-[#0e1520] border border-[#1e2535]/50 px-3.5 py-3"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-zinc-700/40 text-zinc-400 shrink-0">
                {typeIcons[e.event_type] ?? <MapPin style={{ width: 15, height: 15 }} />}
              </div>
              <span className="text-[13px] text-zinc-300 capitalize flex-1 font-medium">
                {typeLabels[e.event_type] ?? e.event_type}
              </span>
              <SeverityBar score={e.severity_score} />
              <span className="text-[10px] text-[#404860] tabular-nums w-10 text-right shrink-0">
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
