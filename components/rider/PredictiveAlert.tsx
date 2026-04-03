"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert } from "lucide-react";
import { useMemo } from "react";

export function PredictiveAlert() {
  const [alert, setAlert] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const fetchRecent = async () => {
      const { data } = await supabase
        .from("live_disruption_events")
        .select("event_type, severity_score")
        .gte("created_at", twoHoursAgo.toISOString())
        .gte("severity_score", 7)
        .limit(1);

      if (data && data.length > 0) {
        const e = data[0];
        setAlert(
          `High disruption risk in your area (${e.event_type}, severity ${e.severity_score}/10). Consider logging off to qualify for automatic payout.`
        );
      }
    };

    fetchRecent();

    const channel = supabase
      .channel("predictive_alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_disruption_events",
        },
        (payload) => {
          const newEvent = payload.new as { event_type?: string; severity_score?: number };
          if ((newEvent.severity_score ?? 0) >= 7) {
            setAlert(
              `High disruption risk: ${newEvent.event_type} (severity ${newEvent.severity_score}/10). Log off to qualify for automatic payout.`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (!alert) return null;

  return (
    <div className="rounded-2xl border border-uber-orange/25 bg-uber-orange/5 overflow-hidden animate-fade-in-up">
      <div className="h-[3px] bg-gradient-to-r from-uber-orange/70 via-uber-orange/40 to-transparent" />
      <div className="flex items-start gap-2.5 px-3.5 py-3.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-uber-orange/15 shrink-0 mt-0.5">
          <ShieldAlert className="h-[18px] w-[18px] text-uber-orange" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-uber-orange/80 uppercase tracking-wider mb-0.5">
            Risk alert
          </p>
          <p className="text-[13px] text-uber-orange/90 leading-snug">{alert}</p>
        </div>
      </div>
    </div>
  );
}
