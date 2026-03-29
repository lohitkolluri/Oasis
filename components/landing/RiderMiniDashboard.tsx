'use client';

import { WalletBalanceCard } from '@/components/rider/WalletBalanceCard';
import { KPIGrid } from '@/components/rider/KPIGrid';
import { WeeklyEarningsChart } from '@/components/rider/WeeklyEarningsChart';
import { ClaimsPreview } from '@/components/rider/ClaimsPreview';
import { motion } from 'framer-motion';

const demoEarnings = [820, 980, 760, 1200, 1340, 890, 1040];

const demoClaims = [
  {
    id: 'clm_3011',
    created_at: '2026-03-17T08:22:00.000Z',
    payout_amount_inr: 250,
    status: 'paid',
    is_flagged: false,
    live_disruption_events: { event_type: 'weather' },
  },
  {
    id: 'clm_2988',
    created_at: '2026-03-15T11:04:00.000Z',
    payout_amount_inr: 300,
    status: 'paid',
    is_flagged: false,
    live_disruption_events: { event_type: 'traffic' },
  },
  {
    id: 'clm_2950',
    created_at: '2026-03-12T18:40:00.000Z',
    payout_amount_inr: 200,
    status: 'paid',
    is_flagged: false,
    live_disruption_events: { event_type: 'social' },
  },
] as any;

export function RiderMiniDashboard() {
  const weekTotal = demoEarnings.reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 pb-2"
    >
      <div className="pt-1 pb-1">
        <h2 className="text-lg font-bold text-white tracking-tight">Good evening, Riya</h2>
        <p className="text-[13px] text-zinc-500 mt-0.5">Your coverage is active</p>
      </div>

      <WalletBalanceCard
        initialBalance={1120}
        weeklyChange={weekTotal}
        policyIds={[]}
        showAction={false}
        sparklineData={demoEarnings}
      />

      <KPIGrid
        totalEarnings={1120}
        claimsPaid={3}
        hasActiveCoverage
        riskLevel="low"
      />

      <WeeklyEarningsChart dailyEarnings={demoEarnings} />

      <ClaimsPreview claims={demoClaims} title="Recent payouts" variant="wallet" claimIdsNeedingVerification={[]} />
    </motion.div>
  );
}

