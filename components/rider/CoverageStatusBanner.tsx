'use client';

import { ButtonLink } from '@/components/ui/Button';
import { getCoverageWeekProgressPercent } from '@/lib/coverage-week';
import { coverageWindowStatus, formatPolicyDateShort } from '@/lib/datetime/oasis-time';
import type { WeeklyPolicy } from '@/lib/types/database';
import { CalendarClock, Shield, ShieldOff } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CoverageStatusBannerProps {
  policy: WeeklyPolicy | null;
  planName?: string;
}

function formatShortDate(d: string) {
  return formatPolicyDateShort(d);
}

export function CoverageStatusBanner({ policy, planName }: CoverageStatusBannerProps) {
  const [hydrated, setHydrated] = useState(false);
  const [windowStatus, setWindowStatus] = useState<{
    status: 'upcoming' | 'active' | 'expired';
    days: number;
    hours: number;
  } | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!policy) return;
    setHydrated(true);
    setWindowStatus(coverageWindowStatus(policy.week_start_date, policy.week_end_date));
    setProgress(getCoverageWeekProgressPercent(policy.week_start_date, policy.week_end_date));
    const interval = setInterval(() => {
      setWindowStatus(coverageWindowStatus(policy.week_start_date, policy.week_end_date));
      setProgress(getCoverageWeekProgressPercent(policy.week_start_date, policy.week_end_date));
    }, 60000);
    return () => clearInterval(interval);
  }, [policy]);

  if (!policy) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-950/30 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 shrink-0">
            <ShieldOff className="h-[18px] w-[18px] text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-amber-300">No active coverage</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Unprotected
              </span>
            </div>
            <p className="text-[11px] text-amber-400/60 mt-0.5">
              Subscribe to a weekly plan to enable automatic payouts
            </p>
          </div>
        </div>
        <ButtonLink
          href="/dashboard/policy"
          variant="primary"
          size="sm"
          className="w-full justify-center mt-3"
        >
          Get coverage →
        </ButtonLink>
      </div>
    );
  }

  const remaining =
    windowStatus ??
    (hydrated
      ? coverageWindowStatus(policy.week_start_date, policy.week_end_date)
      : { status: 'active', days: 0, hours: 0 });
  const totalHoursLeft = remaining.days * 24 + remaining.hours;
  const isExpiringSoon = totalHoursLeft > 0 && totalHoursLeft <= 48;
  const isUpcoming = remaining.status === 'upcoming';

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden px-4 py-3.5 transition-all duration-500 ${
        isExpiringSoon
          ? 'border-amber-500/30 bg-amber-950/20 coverage-shimmer'
          : 'border-uber-green/20 bg-uber-green/5'
      }`}
    >
      {/* Glassmorphism overlay for active state */}
      {!isExpiringSoon && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 90% 10%, rgba(58,167,109,0.08) 0%, transparent 60%)',
          }}
          aria-hidden
        />
      )}

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Shield icon with pulse ring when active */}
          <div className="relative shrink-0">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                isExpiringSoon ? 'bg-amber-500/15' : 'bg-uber-green/15'
              }`}
            >
              <Shield
                className={`h-[18px] w-[18px] ${
                  isExpiringSoon ? 'text-amber-400' : 'text-uber-green'
                }`}
              />
            </div>
            {/* Live pulse ring */}
            {!isExpiringSoon && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3" aria-hidden>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-uber-green/40" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-uber-green border-2 border-[#0c0c0c]" />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-white">
                {planName ?? 'Active coverage'}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isExpiringSoon
                    ? 'text-amber-400 bg-amber-500/15'
                    : 'text-uber-green bg-uber-green/15'
                }`}
              >
                {isExpiringSoon ? 'Expiring' : 'Covered'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <CalendarClock className="h-3 w-3 text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-400 tabular-nums">
                {formatShortDate(policy.week_start_date)} – {formatShortDate(policy.week_end_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Countdown — days + hours */}
        <div className="text-right shrink-0">
          <div className="flex items-baseline gap-0.5 justify-end">
            <span
              className={`text-lg font-bold tabular-nums ${
                isExpiringSoon ? 'text-amber-400' : 'text-uber-green'
              }`}
            >
              {remaining.days}d
            </span>
            <span
              className={`text-[13px] font-semibold tabular-nums ${
                isExpiringSoon ? 'text-amber-400/70' : 'text-uber-green/70'
              }`}
            >
              {remaining.hours}h
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium">
            {isUpcoming ? 'starts in' : remaining.status === 'expired' ? 'ended' : 'remaining'}
          </p>
        </div>
      </div>

      {/* Progress bar with percentage */}
      <div className="relative mt-3">
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out progress-fill"
            style={{
              width: `${(hydrated ? progress : 0).toFixed(6)}%`,
              backgroundColor: isExpiringSoon ? undefined : '#3AA76D',
              backgroundImage: isExpiringSoon
                ? 'linear-gradient(90deg, #3AA76D 0%, #FFC043 100%)'
                : undefined,
            }}
          />
        </div>
        <span className="absolute right-0 -top-4 text-[10px] tabular-nums text-zinc-500 font-medium">
          {Math.round(hydrated ? progress : 0)}%
        </span>
      </div>
    </div>
  );
}
