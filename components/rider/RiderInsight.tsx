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
    <div className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5">
      <Sparkles className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
      <p className="text-sm text-zinc-400 leading-relaxed">{insight}</p>
    </div>
  );
}
