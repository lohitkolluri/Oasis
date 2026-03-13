'use client';

import { gooeyToast } from 'goey-toast';
import { AlertCircle, CheckCircle, Loader2, Zap } from 'lucide-react';
import { useState } from 'react';

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
      const res = await fetch('/api/admin/run-adjudicator', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        const err = data.error ?? 'Failed';
        setResult({ candidates_found: 0, claims_created: 0, error: err });
        gooeyToast.error('Adjudicator failed', { description: err });
        return;
      }
      setResult(data);
      gooeyToast.success('Adjudicator complete', {
        description: `${data.candidates_found} event(s) found. ${data.claims_created} payout(s) created`,
      });
    } catch {
      setResult({ candidates_found: 0, claims_created: 0, error: 'Request failed' });
      gooeyToast.error('Adjudicator failed', { description: 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRun}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-[#7dd3fc] text-black text-sm font-semibold hover:bg-[#93dffe] disabled:opacity-40 transition-colors flex items-center gap-2 shrink-0"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Zap className="h-3.5 w-3.5" />
            Run Adjudicator
          </>
        )}
      </button>

      {result && (
        <span
          className={`flex items-center gap-1.5 text-xs font-medium ${
            result.error ? 'text-[#ef4444]' : 'text-[#22c55e]'
          }`}
        >
          {result.error ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          {result.error
            ? result.error
            : `${result.candidates_found} events, ${result.claims_created} payouts`}
        </span>
      )}
    </div>
  );
}
