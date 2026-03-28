'use client';

import type { WeeklyPolicy } from '@/lib/types/database';
import { cn } from '@/lib/utils';
import { Copy, CreditCard, Hash, RefreshCw, Smartphone, Wallet } from 'lucide-react';
import { useCallback, useState } from 'react';

interface SubscriptionDetailsProps {
  policy: WeeklyPolicy;
  planName: string;
  autoRenewEnabled?: boolean;
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC midnight skew on DATE fields). */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function coverageEndOfDay(weekEnd: string): Date {
  const d = parseLocalDate(weekEnd);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatShortDate(d: string) {
  return parseLocalDate(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days remaining in the coverage week (inclusive of today until end date). */
function getDaysRemaining(weekStart: string, weekEnd: string): number {
  const start = parseLocalDate(weekStart);
  const end = coverageEndOfDay(weekEnd);
  const now = new Date();
  if (now > end) return 0;
  const totalDays =
    Math.round((parseLocalDate(weekEnd).getTime() - parseLocalDate(weekStart).getTime()) / MS_PER_DAY) + 1;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const elapsed = Math.floor((todayStart.getTime() - start.getTime()) / MS_PER_DAY);
  const remaining = totalDays - elapsed;
  return Math.max(0, Math.min(remaining, totalDays));
}

/** Progress 0–100: how much of the week has passed. */
function getProgressPercent(weekStart: string, weekEnd: string): number {
  const start = parseLocalDate(weekStart);
  const end = coverageEndOfDay(weekEnd);
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

/** Razorpay `method` (and legacy DB rows) → rider-facing label (Card, UPI, …). Unknown → em dash. */
function paymentMethodLabel(type: string | null | undefined): string {
  if (!type || !type.trim()) return '—';
  switch (type.toLowerCase()) {
    case 'upi':
      return 'UPI';
    case 'card':
      return 'Card';
    case 'link':
      return 'Link';
    case 'netbanking':
      return 'Net banking';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

export function SubscriptionDetails({
  policy,
  planName,
  autoRenewEnabled = false,
}: SubscriptionDetailsProps) {
  const [copied, setCopied] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const daysLeft = getDaysRemaining(policy.week_start_date, policy.week_end_date);
  const progress = getProgressPercent(policy.week_start_date, policy.week_end_date);
  const displayId = policy.id.slice(0, 8).toUpperCase();
  const methodType = policy.razorpay_payment_method ?? policy.stripe_payment_method_type;
  const methodLabel = paymentMethodLabel(methodType);
  const hasKnownMethod = Boolean(methodType?.trim());

  const handleCopy = useCallback(() => {
    copyToClipboard(policy.id, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [policy.id]);

  const handleCancelAutoRenew = useCallback(async () => {
    setCancelMessage(null);
    setCancelLoading(true);
    try {
      const res = await fetch('/api/payments/cancel-subscription', { method: 'POST' });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setCancelMessage(j.error ?? 'Could not cancel auto-renewal');
        return;
      }
      window.location.reload();
    } catch {
      setCancelMessage('Something went wrong');
    } finally {
      setCancelLoading(false);
    }
  }, []);

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
              <span className="text-white text-lg leading-none" aria-hidden>
                ◇
              </span>
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

      {autoRenewEnabled && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-zinc-300 flex items-center gap-2 min-w-0 pr-2">
              <RefreshCw className="h-3.5 w-3.5 text-uber-green shrink-0" aria-hidden />
              <span id="subscription-auto-renew-label">
                <span className="font-medium text-white">Auto-renew</span>
                <span className="text-zinc-500"> · mandate · weekly</span>
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={true}
              aria-busy={cancelLoading}
              aria-labelledby="subscription-auto-renew-label"
              aria-label={cancelLoading ? 'Turning off auto-renewal' : 'Turn off auto-renewal'}
              disabled={cancelLoading}
              onClick={handleCancelAutoRenew}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uber-green focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
                'disabled:cursor-wait disabled:opacity-70',
                'bg-uber-green',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-out',
                  'translate-x-6',
                )}
              />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Switch off to cancel future weeks.</p>
          {cancelMessage && <p className="mt-2 text-[12px] text-red-400">{cancelMessage}</p>}
        </div>
      )}

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
              {methodType?.toLowerCase() === 'upi' ? (
                <Smartphone className="h-4 w-4" aria-hidden />
              ) : methodType?.toLowerCase() === 'card' ? (
                <CreditCard className="h-4 w-4" aria-hidden />
              ) : (
                <Wallet className="h-4 w-4" aria-hidden />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-500">Payment method</p>
              <p
                className={`text-[13px] font-medium tabular-nums ${hasKnownMethod ? 'text-uber-green' : 'text-zinc-500'}`}
              >
                {methodLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
