'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import type { ParametricClaim, WeeklyPolicy } from '@/lib/types/database';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { PlatformStatus } from './PlatformStatus';
import { PolicyCard } from './PolicyCard';
import { PolicyDocumentsLink } from './PolicyDocumentsLink';
import { PredictiveAlert } from './PredictiveAlert';
import { WalletBalanceCard } from './WalletBalanceCard';
import { KPIGrid } from './KPIGrid';
import { WeeklyEarningsChart } from './WeeklyEarningsChart';
import { RiskRadar } from './RiskRadar';
import { ClaimsPreview } from './ClaimsPreview';
import { RiderInsightCard } from './RiderInsightCard';
import { ReportImpactFAB } from './ReportImpactFAB';

type ClaimWithType = ParametricClaim & {
  live_disruption_events?: { event_type?: string } | null;
};

export interface DashboardContentProps {
  user: User;
  profile: { full_name?: string | null; platform?: string | null } | null;
  greeting: string;
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
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function DashboardContent({
  user,
  profile,
  greeting,
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
  const firstName = profile?.full_name?.split(' ')[0] || 'Delivery partner';
  const platformLabel = profile?.platform
    ? String(profile.platform).charAt(0).toUpperCase() + String(profile.platform).slice(1)
    : 'Delivery';

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Top: greeting + avatar + policy docs */}
      <motion.div
        variants={item}
        className="flex items-center justify-between gap-4 pt-1"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar
            seed={user.id}
            size={46}
            className="ring-2 ring-white/10 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500 font-medium tracking-wide">
              {greeting}
            </p>
            <h1 className="text-[17px] font-semibold text-white leading-tight truncate">
              Hi, {firstName}
            </h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {platformLabel} partner
            </p>
          </div>
        </div>
        <PolicyDocumentsLink />
      </motion.div>

      {/* 1. Wallet Balance Card */}
      <motion.div variants={item}>
        <WalletBalanceCard
          initialBalance={totalPayouts}
          weeklyChange={thisWeekEarned}
          policyIds={policyIds}
          sparklineData={
            weeklyDailyEarnings.some((n) => n > 0)
              ? weeklyDailyEarnings
              : undefined
          }
        />
      </motion.div>

      {/* 2. KPI Grid */}
      <motion.div variants={item}>
        <KPIGrid
          totalEarnings={totalPayouts}
          claimsPaid={totalClaimCount}
          hasActiveCoverage={activePolicy != null}
          riskLevel={riskLevel}
        />
      </motion.div>

      {/* 3. Weekly Earnings Chart */}
      <motion.div variants={item}>
        <WeeklyEarningsChart dailyEarnings={weeklyDailyEarnings} />
      </motion.div>

      {/* 4. Active Policy Card */}
      <motion.div variants={item}>
        <PolicyCard
          policy={activePolicy}
          profileId={user.id}
          claims={claimsFiltered}
          planName={planName}
          claimIdsNeedingVerification={claimIdsNeedingVerification}
        />
      </motion.div>

      {/* Platform status & predictive alert */}
      <PlatformStatus />
      <motion.div variants={item}>
        <PredictiveAlert />
      </motion.div>

      {/* 5. Risk Radar */}
      <motion.div variants={item}>
        <RiskRadar />
      </motion.div>

      {/* 6. Claims Preview */}
      <motion.div variants={item}>
        <ClaimsPreview claims={claimsFiltered} />
      </motion.div>

      {/* 7. Rider Insight (Lumo) */}
      <motion.div variants={item}>
        <RiderInsightCard />
      </motion.div>

      {/* Report impact FAB */}
      <ReportImpactFAB />
    </motion.div>
  );
}
