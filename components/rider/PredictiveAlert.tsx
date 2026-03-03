"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle } from "lucide-react";

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
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 flex gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 shrink-0">
        <AlertTriangle className="h-5 w-5 text-amber-400" />
      </div>
      <p className="text-sm text-amber-100/90 leading-relaxed">{alert}</p>
    </div>
  );
}
