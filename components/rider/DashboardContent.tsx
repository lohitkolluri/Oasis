'use client';

import { domAnimation, LazyMotion, m } from 'framer-motion';
import type { ParametricClaim, WeeklyPolicy } from '@/lib/types/database';
import type { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { PolicyCard } from './PolicyCard';
import { PolicyDocumentsLink } from './PolicyDocumentsLink';
import { PredictiveAlert } from './PredictiveAlert';
import { WalletBalanceCard } from './WalletBalanceCard';
import { KPIGrid } from './KPIGrid';
import { ClaimsPreview } from './ClaimsPreview';
import { RiderInsightCard } from './RiderInsightCard';
import { ReportDeliveryImpact } from './ReportDeliveryImpact';

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
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const WeeklyEarningsChart = dynamic(
  () => import('./WeeklyEarningsChart').then((m) => m.WeeklyEarningsChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
        <div className="px-4 pt-4 pb-1.5 flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="w-full h-[160px] px-3 pb-3">
          <div className="h-full w-full rounded-xl bg-white/5 animate-pulse" />
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
        <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
        <div className="mt-3 h-20 w-full rounded-xl bg-white/5 animate-pulse" />
      </div>
    </div>
  ),
});

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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
  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-3 pb-2"
      >
        {/* Greeting — personal touch */}
        <m.div variants={item} className="pt-1 pb-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ''}
          </h2>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {activePolicy ? 'Your coverage is active' : 'Subscribe to get covered'}
          </p>
        </m.div>

        {/* Urgent: predictive alert at the top when active */}
        <m.div variants={item}>
          <PredictiveAlert />
        </m.div>

        {/* Wallet + KPIs — at a glance */}
        <m.div variants={item}>
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
        </m.div>
        <m.div variants={item}>
          <KPIGrid
            totalEarnings={totalPayouts}
            claimsPaid={totalClaimCount}
            hasActiveCoverage={activePolicy != null}
            riskLevel={riskLevel}
          />
        </m.div>

        {/* Primary CTA — report delivery issue */}
        <m.div variants={item} className="w-full">
          <ReportDeliveryImpact renderTrigger={true} triggerClassName="w-full" />
        </m.div>

        {/* Policy + Earnings — core content */}
        <m.div variants={item}>
          <PolicyCard
            policy={activePolicy}
            profileId={user.id}
            claims={claimsFiltered}
            planName={planName}
          />
        </m.div>
        <m.div variants={item}>
          <WeeklyEarningsChart dailyEarnings={weeklyDailyEarnings} />
        </m.div>
        <m.div variants={item}>
          <ClaimsPreview
            claims={claimsFiltered}
            claimIdsNeedingVerification={claimIdsNeedingVerification}
          />
        </m.div>

        {/* Risk + Insight — secondary info */}
        <m.div variants={item}>
          <RiskRadar />
        </m.div>
        <m.div variants={item}>
          <RiderInsightCard />
        </m.div>

        {/* Policy docs — quick access at bottom */}
        <m.div variants={item}>
          <PolicyDocumentsLink />
        </m.div>
      </m.div>
    </LazyMotion>
  );
}
