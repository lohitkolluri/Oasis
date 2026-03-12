'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Car, ChevronRight, Cloud, FileCheck, Megaphone } from 'lucide-react';
import type { ParametricClaim } from '@/lib/types/database';

type ClaimWithType = ParametricClaim & {
  live_disruption_events?: { event_type?: string } | null;
};

const eventTypeLabel: Record<string, string> = {
  weather: 'Weather',
  traffic: 'Traffic',
  social: 'Social',
};

function eventTypeIcon(type: string) {
  switch (type) {
    case 'weather': return Cloud;
    case 'traffic': return Car;
    case 'social': return Megaphone;
    default: return FileCheck;
  }
}

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

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface ClaimsPreviewProps {
  claims: ClaimWithType[];
  /** Section title (default: "Recent claims") */
  title?: string;
  /** Wallet-style list: icon, label, full date, amount (like expense list) */
  variant?: 'default' | 'wallet';
}

export function ClaimsPreview({ claims, title = 'Recent claims', variant = 'default' }: ClaimsPreviewProps) {
  const list = claims.slice(0, variant === 'wallet' ? 5 : 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-uber-green/12">
            <FileCheck className="h-3.5 w-3.5 text-uber-green" />
          </div>
          <h3 className="text-[13px] font-semibold text-zinc-200">
            {title}
          </h3>
        </div>
        <Link
          href="/dashboard/claims"
          className="text-[11px] font-semibold text-uber-green hover:underline active:opacity-70 flex items-center gap-0.5 min-h-[36px] px-1"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="px-4 pb-4 pt-0">
          <p className="text-[12px] text-zinc-500">No claims yet.</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            Payouts appear when disruptions trigger.
          </p>
        </div>
      ) : (
        <div className={variant === 'wallet' ? 'divide-y divide-white/10' : 'px-3 pb-3 space-y-1.5'}>
          {list.map((c) => {
            const eventType = c.live_disruption_events?.event_type ?? 'payout';
            const type =
              eventType in eventTypeLabel
                ? eventTypeLabel[eventType]
                : (eventType as string);
            const Icon = eventTypeIcon(eventType);

            if (variant === 'wallet') {
              return (
                <Link
                  key={c.id}
                  href="/dashboard/claims"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-zinc-400 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-zinc-200 truncate">
                      {type}
                    </p>
                    <p className="text-[11px] text-zinc-500">{formatFullDate(c.created_at)}</p>
                    <p className="text-[10px] mt-0.5">
                      <span
                        className={
                          c.is_flagged
                            ? 'text-uber-yellow font-semibold'
                            : c.status === 'paid'
                            ? 'text-uber-green font-semibold'
                            : 'text-amber-400 font-semibold'
                        }
                      >
                        {c.is_flagged ? 'Under review' : c.status === 'paid' ? 'Paid' : 'Pending verification'}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`text-[14px] font-bold tabular-nums shrink-0 ${
                      c.status === 'paid' ? 'text-uber-green' : 'text-zinc-400'
                    }`}
                  >
                    {c.status === 'paid' ? '+' : ''}₹{Number(c.payout_amount_inr).toLocaleString('en-IN')}
                  </span>
                </Link>
              );
            }

            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-black/40 border border-white/10 px-3 py-3 active:bg-white/5 transition-colors"
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
                    {c.is_flagged ? 'Under review' : c.status === 'paid' ? 'Paid' : 'Pending'}
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
