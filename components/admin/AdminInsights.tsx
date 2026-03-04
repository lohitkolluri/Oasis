"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";

interface InsightsData {
  summary: string;
  actions: string[];
}

export function AdminInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 h-full flex items-start gap-2.5 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin mt-0.5 shrink-0" />
        <span className="text-sm">Analyzing platform data…</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          AI Intelligence
        </span>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed mb-5">{data.summary}</p>
      {data.actions.length > 0 && (
        <div className="space-y-2.5">
          {data.actions.map((action, i) => (
            <div key={i} className="flex items-start gap-2">
              <ArrowRight className="h-3.5 w-3.5 text-zinc-600 mt-0.5 shrink-0" />
              <span className="text-sm text-zinc-400 leading-relaxed">{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
