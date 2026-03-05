'use client';

import { motion } from 'framer-motion';
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
        description: `${data.candidates_found} event(s) found — ${data.claims_created} payout(s) created`,
      });
    } catch {
      setResult({ candidates_found: 0, claims_created: 0, error: 'Request failed' });
      gooeyToast.error('Adjudicator failed', { description: 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:border-[#3a3a3a] transition-all"
    >
      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-[#7dd3fc]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Adjudicator Engine</p>
            <p className="text-xs text-[#666666] truncate">
              Scan weather, AQI, and news APIs to process eligible payout triggers
            </p>
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-[#7dd3fc] text-black text-sm font-semibold hover:bg-[#93dffe] disabled:opacity-40 transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-neon-cyan-sm"
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
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`px-6 py-3 border-t border-[#2d2d2d] flex items-center gap-2.5 text-xs font-medium ${
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
            : `${result.candidates_found} event(s) found — ${result.claims_created} payout(s) created`}
        </motion.div>
      )}
    </motion.div>
  );
}
