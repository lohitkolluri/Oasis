'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InsightsData {
  summary: string;
  actions: string[];
}

export function AdminInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/insights')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl p-6 h-full flex items-center gap-3 text-[#666666]">
        <Loader2 className="h-4 w-4 animate-spin text-[#7dd3fc] shrink-0" />
        <span className="text-sm">Analyzing platform data…</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl p-6 h-full flex flex-col shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:border-[#3a3a3a] hover:shadow-[0_0_28px_rgba(125,211,252,0.06)] transition-all"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-[#7dd3fc]" />
        </div>
        <div>
          <p className="text-sm font-semibold font-display text-white">Lumo</p>
          <p className="text-[10px] text-[#666666]">AI-powered platform insights</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7dd3fc]/10 border border-[#7dd3fc]/20">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7dd3fc] animate-neon-pulse" />
          <span className="text-[10px] text-[#7dd3fc] font-medium">Live</span>
        </div>
      </div>

      <p className="text-sm text-[#9ca3af] leading-relaxed mb-5">{data.summary}</p>

      {data.actions.length > 0 && (
        <div className="space-y-2 mt-auto">
          <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em] mb-3">
            Recommended Actions
          </p>
          {data.actions.map((action, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#3a3a3a] transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5 text-[#7dd3fc] shrink-0 mt-0.5" />
              <span className="text-sm text-[#9ca3af] leading-relaxed">{action}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
