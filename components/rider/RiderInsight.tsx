"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export function RiderInsight() {
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rider/insight")
      .then((r) => (r.ok ? r.json() : { insight: null }))
      .then((d) => setInsight(d.insight))
      .catch(() => setInsight(null));
  }, []);

  if (!insight) return null;

  return (
    <div className="rounded-[20px] bg-surface-1 border border-uber-yellow/15 overflow-hidden">
      {/* Accent strip */}
      <div className="h-0.5 bg-gradient-to-r from-uber-yellow/60 via-uber-yellow/30 to-transparent" />
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-uber-yellow/12 shrink-0 mt-0.5">
          <Sparkles className="text-uber-yellow" style={{ width: 16, height: 16 }} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-uber-yellow/80 uppercase tracking-[0.12em] mb-1">
            Lumo · Your insight
          </p>
          <p className="text-[13px] text-zinc-300 leading-[1.55]">{insight}</p>
        </div>
      </div>
    </div>
  );
}
