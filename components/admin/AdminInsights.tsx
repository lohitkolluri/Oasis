'use client';

import { motion } from 'framer-motion';
import { Activity, ArrowRight, Flag, Loader2, ShieldAlert, Siren, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface InsightsData {
  headline: string;
  summary: string;
  priorities: Array<{
    id: 'fraud' | 'reports' | 'triggers' | 'claims';
    label: string;
    value: string;
    note: string;
    href: string;
    tone: 'red' | 'amber' | 'violet' | 'emerald' | 'cyan';
  }>;
  watchlist: string[];
}

const toneStyles: Record<InsightsData['priorities'][number]['tone'], string> = {
  red: 'border-[#ef4444]/20 bg-[#ef4444]/10 text-[#ef4444]',
  amber: 'border-[#f59e0b]/20 bg-[#f59e0b]/10 text-[#f59e0b]',
  violet: 'border-[#a78bfa]/20 bg-[#a78bfa]/10 text-[#a78bfa]',
  emerald: 'border-[#22c55e]/20 bg-[#22c55e]/10 text-[#22c55e]',
  cyan: 'border-[#7dd3fc]/20 bg-[#7dd3fc]/10 text-[#7dd3fc]',
};

const priorityIcons = {
  fraud: ShieldAlert,
  reports: Flag,
  triggers: Siren,
  claims: Activity,
} as const;

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
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl p-6 h-full flex items-center justify-center gap-3 text-[#666666]">
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
          <p className="text-sm font-semibold font-display text-white">Operations Brief</p>
          <p className="text-[10px] text-[#666666]">{data.headline}</p>
        </div>
      </div>

      <p className="text-sm text-[#9ca3af] leading-relaxed mb-5">{data.summary}</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {data.priorities.map((priority, i) => {
          const Icon = priorityIcons[priority.id];

          return (
            <motion.div
              key={priority.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-[#2d2d2d] bg-[#1b1b1b] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border ${toneStyles[priority.tone]}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tabular-nums text-white">{priority.value}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666]">
                    {priority.label}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#9ca3af]">{priority.note}</p>
              <Link
                href={priority.href}
                className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#7dd3fc] hover:text-white transition-colors"
              >
                Open
                <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {data.watchlist.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em]">
            Watchlist
          </p>
          {data.watchlist.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="flex items-start gap-3 rounded-xl border border-[#2d2d2d] bg-[#121212] px-3 py-2.5"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7dd3fc]" />
              <span className="text-xs leading-relaxed text-[#9ca3af]">{item}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
