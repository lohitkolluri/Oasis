'use client';

import { motion } from 'framer-motion';
import type { ParametricClaim, WeeklyPolicy } from '@/lib/types/database';
import type { User } from '@supabase/supabase-js';
import { PolicyCard } from './PolicyCard';
import { PolicyDocumentsLink } from './PolicyDocumentsLink';
import { PredictiveAlert } from './PredictiveAlert';
import { WalletBalanceCard } from './WalletBalanceCard';
import { KPIGrid } from './KPIGrid';
import { WeeklyEarningsChart } from './WeeklyEarningsChart';
import { RiskRadar } from './RiskRadar';
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
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3 pb-2"
    >
      {/* Greeting — personal touch */}
      <motion.div variants={item} className="pt-1 pb-1">
        <h2 className="text-lg font-bold text-white tracking-tight">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          {activePolicy ? 'Your coverage is active' : 'Subscribe to get covered'}
        </p>
      </motion.div>

      {/* Urgent: predictive alert at the top when active */}
      <motion.div variants={item}>
        <PredictiveAlert />
      </motion.div>

      {/* Wallet + KPIs — at a glance */}
      <motion.div variants={item}>
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
      </motion.div>
      <motion.div variants={item}>
        <KPIGrid
          totalEarnings={totalPayouts}
          claimsPaid={totalClaimCount}
          hasActiveCoverage={activePolicy != null}
          riskLevel={riskLevel}
        />
      </motion.div>

      {/* Primary CTA — report delivery issue */}
      <motion.div variants={item} className="w-full">
        <ReportDeliveryImpact
          renderTrigger={true}
          triggerClassName="w-full"
        />
      </motion.div>

      {/* Policy + Earnings — core content */}
      <motion.div variants={item}>
        <PolicyCard
          policy={activePolicy}
          profileId={user.id}
          claims={claimsFiltered}
          planName={planName}
        />
      </motion.div>
      <motion.div variants={item}>
        <WeeklyEarningsChart dailyEarnings={weeklyDailyEarnings} />
      </motion.div>
      <motion.div variants={item}>
        <ClaimsPreview
          claims={claimsFiltered}
          claimIdsNeedingVerification={claimIdsNeedingVerification}
        />
      </motion.div>

      {/* Risk + Insight — secondary info */}
      <motion.div variants={item}>
        <RiskRadar />
      </motion.div>
      <motion.div variants={item}>
        <RiderInsightCard />
      </motion.div>

      {/* Policy docs — quick access at bottom */}
      <motion.div variants={item}>
        <PolicyDocumentsLink />
      </motion.div>
    </motion.div>
  );
}
