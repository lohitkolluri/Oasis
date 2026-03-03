"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Zap } from "lucide-react";

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
        setResult({ candidates_found: 0, claims_created: 0, error: data.error ?? "Failed" });
        return;
      }
      setResult(data);
    } catch {
      setResult({ candidates_found: 0, claims_created: 0, error: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-zinc-900/90 border border-emerald-500/20 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10">
          <Zap className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="font-semibold text-zinc-100">Run Adjudicator</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Check weather, AQI, news APIs and process eligible payouts
          </p>
        </div>
      </div>
      <Button
        onClick={handleRun}
        disabled={loading}
        variant="primary"
        size="sm"
      >
        {loading ? "Running..." : "Run now"}
      </Button>
      {result && (
        <p className={`mt-3 text-sm ${result.error ? "text-red-400" : "text-zinc-400"}`}>
          {result.error
            ? result.error
            : `${result.candidates_found} event(s) found → ${result.claims_created} payout(s). Check Risk Radar & wallet.`}
        </p>
      )}
    </div>
  );
}
