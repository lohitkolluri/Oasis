'use client';

import { Avatar } from '@/components/ui/Avatar';
import type { ParametricClaim, WeeklyPolicy } from '@/lib/types/database';
import type { User } from '@supabase/supabase-js';
import { History, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { PlatformStatus } from './PlatformStatus';
import { PolicyCard } from './PolicyCard';
import { PolicyDocumentsLink } from './PolicyDocumentsLink';
import { PredictiveAlert } from './PredictiveAlert';
import { RealtimeWallet } from './RealtimeWallet';
import { ReportDeliverySection } from './ReportDeliverySection';
import { RiderInsight } from './RiderInsight';
import { RiskRadar } from './RiskRadar';
import { WalletCard } from './WalletCard';

interface DashboardContentProps {
  user: User;
  profile: { full_name?: string | null; platform?: string | null } | null;
  greeting: string;
  policyIds: string[];
  totalPayouts: number;
  totalClaimCount: number;
  claimsFiltered: ParametricClaim[];
  activePolicy: WeeklyPolicy | null;
  planName?: string;
  claimIdsNeedingVerification: string[];
}

export function DashboardContent({
  user,
  profile,
  greeting,
  policyIds,
  totalPayouts,
  totalClaimCount,
  claimsFiltered,
  activePolicy,
  planName,
  claimIdsNeedingVerification,
}: DashboardContentProps) {
  const firstName = profile?.full_name?.split(' ')[0] || 'Partner';
  const platformLabel = profile?.platform
    ? String(profile.platform).charAt(0).toUpperCase() + String(profile.platform).slice(1)
    : 'Delivery';

  return (
    <div className="space-y-4">
      {/* M3 Hero — greeting + avatar */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar seed={user.id} size={46} className="ring-2 ring-[#1e2535] shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-[#606880] font-medium tracking-wide">{greeting}</p>
            <h1 className="text-[17px] font-semibold text-white leading-tight truncate">
              Hi, {firstName}
            </h1>
            <p className="text-[11px] text-[#606880] mt-0.5">{platformLabel} partner</p>
          </div>
        </div>
        <PolicyDocumentsLink />
      </div>

      {/* M3 KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Earnings card */}
        <div className="rounded-[20px] bg-[#111820] border border-[#1e2535]/70 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/12">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-[22px] font-bold text-white tabular-nums tracking-tight leading-none">
            ₹{totalPayouts.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-[#606880] mt-1.5 font-medium">Total earned</p>
          <p className="text-[10px] text-[#404860] mt-0.5">From payouts</p>
        </div>

        {/* Claims card */}
        <div className="rounded-[20px] bg-[#111820] border border-[#1e2535]/70 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500/12">
              <History className="h-4 w-4 text-sky-400" />
            </div>
          </div>
          <p className="text-[22px] font-bold text-white tabular-nums tracking-tight leading-none">
            {totalClaimCount}
          </p>
          <p className="text-[11px] text-[#606880] mt-1.5 font-medium">Claims</p>
          <p className="text-[10px] text-[#404860] mt-0.5">Parametric payouts</p>
        </div>
      </div>

      {/* AI insight */}
      <RiderInsight />

      {/* Platform disruption alert */}
      <PlatformStatus />

      {/* Predictive risk alert */}
      <PredictiveAlert />

      {/* Wallet — live balance or static */}
      {policyIds.length > 0 ? (
        <RealtimeWallet
          profileId={user.id}
          initialBalance={totalPayouts}
          initialClaimCount={totalClaimCount}
          policyIds={policyIds}
          platform={profile?.platform ?? 'zepto'}
        />
      ) : (
        <WalletCard
          balance={totalPayouts}
          platform={profile?.platform ?? 'zepto'}
          claimCount={totalClaimCount}
          profileId={user.id}
        />
      )}

      {/* Active policy */}
      <PolicyCard
        policy={activePolicy}
        profileId={user.id}
        claims={claimsFiltered}
        planName={planName}
        claimIdsNeedingVerification={claimIdsNeedingVerification}
      />

      {/* Live disruption feed */}
      <RiskRadar />

      {/* View all claims */}
      {totalClaimCount > 0 && (
        <Link
          href="/dashboard/claims"
          className="flex items-center justify-between gap-3 rounded-[20px] border border-[#1e2535]/70 bg-[#111820] px-5 py-4 hover:bg-[#151d2a] transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-emerald-500/12 group-hover:bg-emerald-500/18 transition-colors">
              <History className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-zinc-200 block">All claims</span>
              <span className="text-[11px] text-[#606880]">{totalClaimCount} total</span>
            </div>
          </div>
          <span className="text-[#404860] group-hover:text-emerald-400 transition-colors text-lg">›</span>
        </Link>
      )}

      {/* Report delivery impact */}
      <ReportDeliverySection />
    </div>
  );
}
