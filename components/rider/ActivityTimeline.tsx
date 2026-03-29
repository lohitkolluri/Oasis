'use client';

import { Card } from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Car,
  ChevronRight,
  Cloud,
  FileCheck,
  Megaphone,
  TrendingUp,
  Shield,
  AlertTriangle,
  Clock,
  Zap,
} from 'lucide-react';
import type { ParametricClaim } from '@/lib/types/database';
import { ClaimVerificationPrompt } from './ClaimVerificationPrompt';

type ClaimWithType = ParametricClaim & {
  live_disruption_events?: { event_type?: string } | null;
};

/* ---- Stat strip ---- */

interface CompactStatsProps {
  totalPayouts: number;
  claimsPaid: number;
  hasActiveCoverage: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

const statConfig = {
  earned: { gradient: 'from-amber-500/10 to-amber-500/5', accent: 'text-amber-400' },
  claims: { gradient: 'from-zinc-500/10 to-zinc-500/5', accent: 'text-zinc-300' },
  cover: { gradient: 'from-uber-green/10 to-uber-green/5', accent: 'text-uber-green' },
  coverOff: { gradient: 'from-zinc-600/10 to-zinc-600/5', accent: 'text-zinc-500' },
  riskLow: { gradient: 'from-sky-500/10 to-sky-500/5', accent: 'text-sky-400' },
  riskMed: { gradient: 'from-amber-500/10 to-amber-500/5', accent: 'text-amber-400' },
  riskHigh: { gradient: 'from-red-500/10 to-red-500/5', accent: 'text-red-400' },
};

function CompactStats({ totalPayouts, claimsPaid, hasActiveCoverage, riskLevel }: CompactStatsProps) {
  const riskLabel = riskLevel === 'high' ? 'High' : riskLevel === 'medium' ? 'Med' : 'Low';
  const riskStyle =
    riskLevel === 'high'
      ? statConfig.riskHigh
      : riskLevel === 'medium'
        ? statConfig.riskMed
        : statConfig.riskLow;

  const stats = [
    {
      icon: TrendingUp,
      value: `₹${totalPayouts.toLocaleString('en-IN')}`,
      label: 'Earned',
      style: statConfig.earned,
    },
    {
      icon: FileCheck,
      value: String(claimsPaid),
      label: 'Payouts',
      style: statConfig.claims,
    },
    {
      icon: Shield,
      value: hasActiveCoverage ? 'On' : '—',
      label: 'Cover',
      style: hasActiveCoverage ? statConfig.cover : statConfig.coverOff,
    },
    {
      icon: AlertTriangle,
      value: riskLabel,
      label: 'Risk',
      style: riskStyle,
    },
  ];

  return (
    <div className="flex items-stretch gap-px bg-white/5 rounded-xl overflow-hidden">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 px-1 bg-gradient-to-b ${s.style.gradient} min-w-0`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Icon className={`h-3 w-3 shrink-0 ${s.style.accent}`} />
              <span className={`text-[13px] font-bold tabular-nums truncate ${s.style.accent}`}>
                {s.value}
              </span>
            </div>
            <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---- Claim timeline item helpers ---- */

const eventTypeLabel: Record<string, string> = {
  weather: 'Weather disruption',
  traffic: 'Traffic disruption',
  social: 'Social event',
};

const eventTypeIconBg: Record<string, string> = {
  weather: 'bg-sky-500/15 text-sky-400',
  traffic: 'bg-amber-500/15 text-amber-400',
  social: 'bg-red-500/15 text-red-400',
};

const eventTypeBorderColor: Record<string, string> = {
  weather: 'border-l-sky-500/40',
  traffic: 'border-l-amber-500/40',
  social: 'border-l-red-500/40',
};

function eventTypeIcon(type: string) {
  switch (type) {
    case 'weather': return Cloud;
    case 'traffic': return Car;
    case 'social': return Megaphone;
    default: return FileCheck;
  }
}

function plainLanguageStatus(claim: ClaimWithType): { label: string; step: number; total: number } {
  if (claim.is_flagged) return { label: 'Under review', step: 2, total: 3 };
  switch (claim.status) {
    case 'paid': return { label: 'Paid', step: 3, total: 3 };
    case 'pending_verification': return { label: 'Verifying zone', step: 2, total: 3 };
    case 'triggered': return { label: 'Triggered', step: 1, total: 3 };
    default: return { label: 'Processing', step: 1, total: 3 };
  }
}

function statusColor(claim: ClaimWithType): string {
  if (claim.is_flagged) return 'text-uber-yellow';
  if (claim.status === 'paid') return 'text-uber-green';
  return 'text-amber-400';
}

function StepTracker({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            i < step ? 'bg-uber-green' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  );
}

function formatTimeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ---- Main component ---- */

export interface ActivityTimelineProps {
  claims: ClaimWithType[];
  totalPayouts: number;
  claimsPaid: number;
  hasActiveCoverage: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  claimIdsNeedingVerification?: string[];
  /** When false, hides the 4-stat strip (wallet + coverage banner already show this). */
  showCompactStats?: boolean;
}

export function ActivityTimeline({
  claims,
  totalPayouts,
  claimsPaid,
  hasActiveCoverage,
  riskLevel,
  claimIdsNeedingVerification = [],
  showCompactStats = true,
}: ActivityTimelineProps) {
  const list = claims.slice(0, 5);

  return (
    <Card variant="default" padding="none" className="rounded-2xl border-white/10 bg-[#0c0c0c] overflow-hidden">
      {showCompactStats && (
        <CompactStats
          totalPayouts={totalPayouts}
          claimsPaid={claimsPaid}
          hasActiveCoverage={hasActiveCoverage}
          riskLevel={riskLevel}
        />
      )}

      {/* Timeline header */}
      <div
        className={`flex items-center justify-between px-4 pb-2 ${showCompactStats ? 'pt-3.5' : 'pt-4'}`}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-uber-green/12">
            <Clock className="h-3.5 w-3.5 text-uber-green" />
          </div>
          <h3 className="text-[13px] font-semibold text-zinc-200">Activity</h3>
        </div>
        <Link
          href="/dashboard/claims"
          className="text-[11px] font-semibold text-uber-green hover:underline active:opacity-70 flex items-center gap-0.5 min-h-[36px] px-1"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Timeline items */}
      {list.length === 0 ? (
        <div className="px-4 pb-5 pt-1 flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 mb-3">
            <Zap className="h-5 w-5 text-zinc-600" />
          </div>
          <p className="text-[12px] text-zinc-400 font-medium">No activity yet</p>
          <p className="text-[11px] text-zinc-600 mt-0.5 max-w-[220px] leading-relaxed">
            Payouts appear when disruptions trigger in your zone
          </p>
        </div>
      ) : (
        <div className="px-3 pb-3 space-y-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((c) => {
              const eventType = c.live_disruption_events?.event_type ?? 'payout';
              const type =
                eventType in eventTypeLabel
                  ? eventTypeLabel[eventType]
                  : (eventType as string);
              const Icon = eventTypeIcon(eventType);
              const iconBg = eventTypeIconBg[eventType] ?? 'bg-white/10 text-zinc-400';
              const borderLeft = eventTypeBorderColor[eventType] ?? 'border-l-zinc-700/40';
              const status = plainLanguageStatus(c);
              const color = statusColor(c);

              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <div
                    className={`flex items-center gap-3 rounded-xl bg-black/40 border border-white/10 border-l-2 ${borderLeft} px-3 py-3 active:bg-white/5 transition-colors`}
                  >
                    {/* Icon with event-type color */}
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-zinc-200 truncate">
                          {type}
                        </p>
                        <StepTracker step={status.step} total={status.total} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[11px] font-semibold ${color}`}>
                          {status.label}
                        </span>
                        <span className="text-[10px] text-zinc-600">·</span>
                        <span className="text-[10px] text-zinc-500 tabular-nums">
                          {formatTimeAgo(c.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[14px] font-bold tabular-nums ${
                          c.status === 'paid' ? 'text-uber-green' : 'text-zinc-400'
                        }`}
                      >
                        {c.status === 'paid' ? '+' : ''}₹{Number(c.payout_amount_inr).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Verification prompt */}
                  {claimIdsNeedingVerification.includes(c.id) && (
                    <ClaimVerificationPrompt claimId={c.id} />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
