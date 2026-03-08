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
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {/* Policy docs — compact */}
      <motion.div variants={item}>
        <PolicyDocumentsLink />
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

      {/* Policy + Earnings + Claims — core content */}
      <motion.div variants={item}>
        <PolicyCard
          policy={activePolicy}
          profileId={user.id}
          claims={claimsFiltered}
          planName={planName}
          claimIdsNeedingVerification={claimIdsNeedingVerification}
        />
      </motion.div>
      <motion.div variants={item}>
        <WeeklyEarningsChart dailyEarnings={weeklyDailyEarnings} />
      </motion.div>
      <motion.div variants={item}>
        <ClaimsPreview claims={claimsFiltered} />
      </motion.div>

      {/* Alerts + insight — compact */}
      <motion.div variants={item}>
        <PredictiveAlert />
      </motion.div>
      <motion.div variants={item}>
        <RiskRadar />
      </motion.div>
      <motion.div variants={item}>
        <RiderInsightCard />
      </motion.div>
    </motion.div>
  );
}
