"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    score >= 7 ? "bg-uber-red" : score >= 4 ? "bg-uber-yellow" : "bg-uber-green";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-[11px] font-bold tabular-nums ${
          score >= 7 ? "text-uber-red" : score >= 4 ? "text-uber-yellow" : "text-uber-green"
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
    <div className="rounded-2xl bg-surface-1 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-uber-yellow/12">
            <Activity className="h-4 w-4 text-uber-yellow" />
          </div>
          <p className="text-[12px] font-semibold text-zinc-200">Risk Radar</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="px-4 pb-4 pt-1 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-uber-green/10 mx-auto mb-2">
            <Activity className="h-5 w-5 text-uber-green/50" />
          </div>
          <p className="text-[12px] font-medium text-zinc-400">All clear</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">No active disruptions in your area</p>
        </div>
      ) : (
        <div className="px-3 pb-3 space-y-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {events.map((e, i) => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2.5 rounded-lg bg-black/40 border border-white/10 px-3 py-2.5"
              >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-700/40 text-zinc-400 shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                {typeIcons[e.event_type] ?? <MapPin className="h-3.5 w-3.5" />}
              </div>
              <span className="text-[12px] text-zinc-300 capitalize flex-1 font-medium min-w-0 truncate">
                {typeLabels[e.event_type] ?? e.event_type}
              </span>
              <SeverityBar score={e.severity_score} />
              <span className="text-[10px] text-zinc-600 tabular-nums w-9 text-right shrink-0">
                {new Date(e.created_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
