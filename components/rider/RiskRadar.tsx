"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Activity, MapPin, Cloud, Car, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/Card";

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

const typeIconBg: Record<string, string> = {
  weather: "bg-sky-500/15 text-sky-400",
  traffic: "bg-amber-500/15 text-amber-400",
  social: "bg-red-500/15 text-red-400",
};

const typeBorderColor: Record<string, string> = {
  weather: "border-l-sky-500/40",
  traffic: "border-l-amber-500/40",
  social: "border-l-red-500/40",
};

function SeverityBadge({ score }: { score: number }) {
  const level =
    score >= 7 ? "high" : score >= 4 ? "med" : "low";
  const config = {
    high: {
      bg: "bg-uber-red/15",
      text: "text-uber-red",
      glow: "shadow-[0_0_8px_rgba(212,67,51,0.2)]",
      label: "High",
    },
    med: {
      bg: "bg-uber-yellow/15",
      text: "text-uber-yellow",
      glow: "shadow-[0_0_8px_rgba(255,192,67,0.15)]",
      label: "Med",
    },
    low: {
      bg: "bg-uber-green/15",
      text: "text-uber-green",
      glow: "",
      label: "Low",
    },
  };
  const c = config[level];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold tabular-nums ${c.bg} ${c.text} ${c.glow}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          score >= 7 ? "bg-uber-red" : score >= 4 ? "bg-uber-yellow" : "bg-uber-green"
        }`}
      />
      {score}/10
    </span>
  );
}

/** DD/MM · 12-hour local time */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day}/${month} · ${time}`;
}

function isRecent(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return now.getTime() - d.getTime() < 30 * 60 * 1000; // 30 minutes
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
    <Card variant="default" padding="none" className="rounded-2xl border-white/10 bg-surface-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-uber-yellow/12">
            <Activity className="h-4 w-4 text-uber-yellow" />
          </div>
          <p className="text-[12px] font-semibold text-zinc-200">Risk Radar</p>
        </div>
        {events.length > 0 && (
          <span className="text-[10px] font-medium text-zinc-500 tabular-nums">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        )}
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
        <div className="px-3 pb-3 max-h-[280px] overflow-y-auto scrollbar-thin space-y-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {events.map((e) => {
              const iconBg = typeIconBg[e.event_type] ?? "bg-zinc-700/40 text-zinc-400";
              const borderColor = typeBorderColor[e.event_type] ?? "border-l-zinc-700/40";
              const recent = isRecent(e.created_at);

              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center gap-3 rounded-xl bg-black/40 border border-white/10 border-l-2 ${borderColor} px-3 py-2.5 active:bg-white/5 transition-colors`}
                >
                  {/* Icon with event-type color */}
                  <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${iconBg}`}>
                    {typeIcons[e.event_type] ?? <MapPin className="h-4 w-4" />}
                    {/* Live pulse for recent events */}
                    {recent && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5" aria-hidden>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-uber-red/40" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-uber-red border border-[#0c0c0c]" />
                      </span>
                    )}
                  </div>

                  {/* Label + time */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-zinc-200 capitalize font-medium truncate block">
                      {typeLabels[e.event_type] ?? e.event_type}
                    </span>
                    <span className="text-[10px] tabular-nums text-zinc-500 block mt-0.5">
                      {formatWhen(e.created_at)}
                    </span>
                  </div>

                  {/* Severity badge */}
                  <div className="shrink-0">
                    <SeverityBadge score={e.severity_score} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
