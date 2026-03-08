'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FileCheck, ChevronRight } from 'lucide-react';
import type { ParametricClaim } from '@/lib/types/database';

type ClaimWithType = ParametricClaim & {
  live_disruption_events?: { event_type?: string } | null;
};

const eventTypeLabel: Record<string, string> = {
  weather: 'Weather',
  traffic: 'Traffic',
  social: 'Social',
};

function formatTimeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface ClaimsPreviewProps {
  claims: ClaimWithType[];
}

export function ClaimsPreview({ claims }: ClaimsPreviewProps) {
  const list = claims.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.35 }}
      className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-uber-green/12">
            <FileCheck className="h-4 w-4 text-uber-green" />
          </div>
          <h3 className="text-[13px] font-semibold text-zinc-200">
            Recent claims
          </h3>
        </div>
        <Link
          href="/dashboard/claims"
          className="text-[11px] font-medium text-uber-green hover:text-uber-green flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="px-5 pb-5 pt-1">
          <p className="text-[12px] text-zinc-500">No claims yet.</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            Payouts appear here when disruptions trigger.
          </p>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2">
          {list.map((c, i) => {
            const type =
              c.live_disruption_events?.event_type != null
                ? eventTypeLabel[c.live_disruption_events.event_type] ?? c.live_disruption_events.event_type
                : 'Payout';
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-black/40 border border-white/10 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-200 truncate">
                    {type}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatTimeAgo(c.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] font-bold text-uber-green tabular-nums">
                    ₹{Number(c.payout_amount_inr).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-semibold text-uber-green/80 bg-uber-green/10 px-2 py-0.5 rounded-full">
                    {c.status === 'paid' ? 'Paid' : 'Triggered'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
