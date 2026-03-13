'use client';

import { Activity, ArrowRight, Flag, Loader2, ShieldAlert, Siren } from 'lucide-react';
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
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-6 h-full flex items-center justify-center gap-3 text-[#555]">
        <Loader2 className="h-4 w-4 animate-spin text-[#7dd3fc] shrink-0" />
        <span className="text-sm">Analyzing platform data...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5 h-full flex flex-col">
      <div className="mb-4">
        <p className="text-sm font-semibold text-white">Operations Brief</p>
        <p className="text-[10px] text-[#555] mt-0.5">{data.headline}</p>
      </div>

      <p className="text-sm text-[#9ca3af] leading-relaxed mb-4">{data.summary}</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {data.priorities.map((priority) => {
          const Icon = priorityIcons[priority.id];

          return (
            <div
              key={priority.id}
              className="rounded-xl border border-[#2d2d2d] bg-[#1b1b1b] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${toneStyles[priority.tone]}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tabular-nums text-white">{priority.value}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#555]">
                    {priority.label}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#9ca3af]">{priority.note}</p>
              <Link
                href={priority.href}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#7dd3fc] hover:text-white transition-colors"
              >
                Open
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>

      {data.watchlist.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] font-medium text-[#555] uppercase tracking-[0.1em]">
            Watchlist
          </p>
          {data.watchlist.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-[#2d2d2d] bg-[#121212] px-3 py-2"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7dd3fc]" />
              <span className="text-xs leading-relaxed text-[#9ca3af]">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
