"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert } from "lucide-react";

export function PredictiveAlert() {
  const [alert, setAlert] = useState<string | null>(null);

  const supabase = createClient();

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
    <div className="rounded-[20px] border border-orange-500/20 bg-[#180f06] overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-orange-500/60 via-orange-400/30 to-transparent" />
      <div className="flex items-start gap-3 p-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-orange-500/12 shrink-0 mt-0.5">
          <ShieldAlert className="text-orange-400" style={{ width: 16, height: 16 }} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.12em] mb-1">
            Risk alert
          </p>
          <p className="text-[13px] text-orange-100/80 leading-[1.55]">{alert}</p>
        </div>
      </div>
    </div>
  );
}
