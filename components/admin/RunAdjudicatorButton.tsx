"use client";

import { useState } from "react";
import { Zap, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export function RunAdjudicatorButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    candidates_found: number;
    claims_created: number;
    error?: string;
  } | null>(null);

  async function handleRun() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/run-adjudicator", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult({
          candidates_found: 0,
          claims_created: 0,
          error: data.error ?? "Failed",
        });
        return;
      }
      setResult(data);
    } catch {
      setResult({
        candidates_found: 0,
        claims_created: 0,
        error: "Request failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-zinc-600" />
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          Adjudicator
        </span>
      </div>
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-400 leading-relaxed">
          Scan weather, AQI, and news APIs to process eligible payout triggers.
        </p>
        <button
          onClick={handleRun}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5" />
              Run now
            </>
          )}
        </button>
      </div>
      {result && (
        <div
          className={`px-5 py-3 border-t border-zinc-800 flex items-center gap-2 text-xs ${
            result.error ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {result.error ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {result.error
              ? result.error
              : `${result.candidates_found} event(s) found — ${result.claims_created} payout(s) created`}
          </span>
        </div>
      )}
    </div>
  );
}
