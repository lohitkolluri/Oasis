'use client';

import type { WeeklyPolicy } from '@/lib/types/database';
import { Copy, CreditCard, Hash, Wallet } from 'lucide-react';
import { useCallback, useState } from 'react';

interface SubscriptionDetailsProps {
  policy: WeeklyPolicy;
  planName: string;
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/** Days remaining in the coverage week (0 = last day). */
function getDaysRemaining(weekStart: string, weekEnd: string): number {
  const end = new Date(weekEnd);
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  if (now > end) return 0;
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const totalDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const elapsed = Math.round((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const remaining = totalDays - elapsed;
  return Math.max(0, Math.min(remaining, totalDays));
}

/** Progress 0–100: how much of the week has passed. */
function getProgressPercent(weekStart: string, weekEnd: string): number {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const now = new Date();
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

function copyToClipboard(text: string, onCopied: () => void) {
  if (typeof navigator?.clipboard?.writeText === 'function') {
    navigator.clipboard.writeText(text).then(onCopied);
  }
}

export function SubscriptionDetails({ policy, planName }: SubscriptionDetailsProps) {
  const [copied, setCopied] = useState(false);
  const daysLeft = getDaysRemaining(policy.week_start_date, policy.week_end_date);
  const progress = getProgressPercent(policy.week_start_date, policy.week_end_date);
  const displayId = policy.id.slice(0, 8).toUpperCase();

  const handleCopy = useCallback(() => {
    copyToClipboard(policy.id, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [policy.id]);

  return (
    <div className="space-y-6">
      {/* Current plan card — gradient accent, consistent radius */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface-1">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              'linear-gradient(135deg, rgba(115,86,191,0.35) 0%, rgba(168,85,247,0.25) 50%, rgba(236,72,153,0.2) 100%)',
          }}
        />
        <div className="relative px-4 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 shrink-0">
              <span className="text-white text-lg leading-none" aria-hidden>◇</span>
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/70 uppercase tracking-wider">
                Current plan
              </p>
              <p className="text-lg font-bold text-white mt-0.5">{planName}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#7356BF]/80 px-2.5 py-1 text-[10px] font-semibold text-white uppercase tracking-wider">
            Active
          </span>
        </div>
      </div>

      {/* Coverage period — matches app section label style */}
      <div className="rounded-2xl border border-white/10 bg-surface-1 px-4 py-4">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Coverage period
        </p>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-white">Time remaining</p>
          <span className="rounded-full bg-uber-green/20 px-2.5 py-1 text-[11px] font-semibold text-uber-green">
            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-uber-green transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-zinc-500">
          <span>Started {formatShortDate(policy.week_start_date)}</span>
          <span>Ends {formatShortDate(policy.week_end_date)}</span>
        </div>
      </div>

      {/* Payment details — same card style as rest of app */}
      <div className="rounded-2xl border border-white/10 bg-surface-1 px-4 py-4">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Payment details
        </p>
        <div className="space-y-0 divide-y divide-white/10">
          <div className="flex items-center gap-3 py-3 first:pt-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-zinc-400 shrink-0">
              <Hash className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-500">Policy ID</p>
              <p className="text-[13px] font-medium text-white tabular-nums truncate">
                #{displayId}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={copied ? 'Copied' : 'Copy policy ID'}
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 py-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-zinc-400 shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-500">Amount paid</p>
              <p className="text-[13px] font-semibold text-white tabular-nums">
                ₹{Number(policy.weekly_premium_inr).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-zinc-400 shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-500">Payment method</p>
              <p className="text-[13px] font-medium text-uber-green">Card</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
