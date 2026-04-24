'use client';

import { domAnimation, LazyMotion, m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ParametricClaim, WeeklyPolicy } from '@/lib/types/database';
import type { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { ActivityTimeline } from './ActivityTimeline';
import { CoverageStatusBanner } from './CoverageStatusBanner';
import { PredictiveAlert } from './PredictiveAlert';
import { PolicyCard } from './PolicyCard';
import { QuickLinks } from './QuickLinks';
import { ReportDeliveryImpact } from './ReportDeliveryImpact';
import { RiderInsightCard } from './RiderInsightCard';
import { RiderSk } from './RiderSkeleton';
import { WalletBalanceCard } from './WalletBalanceCard';
import { useRiderI18n } from './RiderI18nProvider';

type ClaimWithType = ParametricClaim & {
  live_disruption_events?: { event_type?: string } | null;
};

export interface DashboardContentProps {
  user: User;
  profile: { full_name?: string | null; platform?: string | null } | null;
  policyIds: string[];
  totalPayouts: number;
  totalClaimCount: number;
  thisWeekEarned: number;
  weeklyDailyEarnings: number[];
  riskLevel: 'low' | 'medium' | 'high';
  claimsFiltered: ClaimWithType[];
  activePolicy: WeeklyPolicy | null;
  planName?: string;
  claimIdsNeedingVerification: string[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const WeeklyEarningsChart = dynamic(
  () => import('./WeeklyEarningsChart').then((m) => m.WeeklyEarningsChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
        <div className="px-4 pt-4 pb-1.5 flex items-center justify-between">
          <RiderSk className="h-4 w-40 rounded" />
          <RiderSk className="h-4 w-20 rounded" />
        </div>
        <div className="w-full h-[160px] px-3 pb-3">
          <RiderSk className="h-full w-full rounded-xl" />
        </div>
      </div>
    ),
  },
);

const RiskRadar = dynamic(() => import('./RiskRadar').then((m) => m.RiskRadar), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
      <div className="px-4 pt-4 pb-4">
        <RiderSk className="h-4 w-28 rounded" />
        <RiderSk className="mt-3 h-20 w-full rounded-xl" />
      </div>
    </div>
  ),
});

function getGreeting(messages: ReturnType<typeof useRiderI18n>['messages']): string {
  const h = new Date().getHours();
  if (h < 12) return messages.dashboard.morning;
  if (h < 17) return messages.dashboard.afternoon;
  return messages.dashboard.evening;
}

export function DashboardContent({
  user,
  profile,
  policyIds,
  totalPayouts,
  totalClaimCount,
  thisWeekEarned,
  weeklyDailyEarnings,
  riskLevel,
  claimsFiltered,
  activePolicy,
  planName,
  claimIdsNeedingVerification,
}: DashboardContentProps) {
  const { messages } = useRiderI18n();
  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 pb-4"
      >
        {/* Hero: greeting + coverage */}
        <m.section variants={item} className="space-y-3">
          <div className="pt-0.5">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {getGreeting(messages)}
              {firstName ? `, ${firstName}` : ''}
            </h2>
          </div>
          <CoverageStatusBanner policy={activePolicy} planName={planName} />
          <PredictiveAlert />
        </m.section>

        {/* Wallet */}
        <m.section variants={item}>
          <WalletBalanceCard
            initialBalance={totalPayouts}
            weeklyChange={thisWeekEarned}
            policyIds={policyIds}
            showAction
            sparklineData={
              weeklyDailyEarnings.some((n) => n > 0)
                ? weeklyDailyEarnings
                : undefined
            }
          />
        </m.section>

        {/* Activity (no duplicate stat strip — wallet + banner cover it) */}
        <m.section variants={item}>
          <ActivityTimeline
            claims={claimsFiltered}
            totalPayouts={totalPayouts}
            claimsPaid={totalClaimCount}
            hasActiveCoverage={activePolicy != null}
            riskLevel={riskLevel}
            claimIdsNeedingVerification={claimIdsNeedingVerification}
            showCompactStats={false}
          />
        </m.section>

        {/* Actions: compact policy row + quieter report CTA */}
        <m.section variants={item} className="space-y-2">
          <PolicyCard
            policy={activePolicy}
            profileId={user.id}
            claims={claimsFiltered}
            planName={planName}
            compact
          />
          <ReportDeliveryImpact
            renderTrigger
            triggerTone="neutral"
            triggerClassName="w-full"
          />
        </m.section>

        {/* Secondary: charts & radar (collapsed by default) */}
        <m.section variants={item}>
          <details className="group rounded-2xl border border-white/10 bg-surface-1 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] open:shadow-[0_0_0_1px_rgba(58,167,109,0.12)_inset] overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-left min-h-[52px] hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uber-green/35 focus-visible:ring-inset rounded-t-2xl">
              <div className="min-w-0">
                <span className="text-[13px] font-semibold text-zinc-200">
                  {messages.dashboard.chartTitle}
                </span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {messages.dashboard.chartHint}
                </p>
              </div>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-zinc-400 group-open:text-uber-green transition-[transform,color] duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="space-y-4 border-t border-white/10 bg-black/30 px-1 sm:px-0 pb-4 pt-4">
              <WeeklyEarningsChart dailyEarnings={weeklyDailyEarnings} />
              <RiskRadar />
            </div>
          </details>
        </m.section>

        <m.section variants={item}>
          <QuickLinks />
        </m.section>

        <m.div variants={item}>
          <RiderInsightCard />
        </m.div>
      </m.div>
    </LazyMotion>
  );
}
