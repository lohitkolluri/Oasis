"use client";

import Link from "next/link";
import { WalletCard } from "./WalletCard";
import { RealtimeWallet } from "./RealtimeWallet";
import { PolicyCard } from "./PolicyCard";
import { PolicyDocumentsLink } from "./PolicyDocumentsLink";
import { PlatformStatus } from "./PlatformStatus";
import { ReportDeliverySection } from "./ReportDeliverySection";
import { RiskRadar } from "./RiskRadar";
import { PredictiveAlert } from "./PredictiveAlert";
import { RiderInsight } from "./RiderInsight";
import { Avatar } from "@/components/ui/Avatar";
import { History } from "lucide-react";
import type { ParametricClaim, WeeklyPolicy } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

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
  const firstName = profile?.full_name?.split(" ")[0] || "Partner";

  return (
    <div className="space-y-5">
      {/* Greeting header */}
      <div className="flex items-center gap-3">
        <Avatar seed={user.id} size={40} className="ring-1 ring-zinc-700/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500">{greeting}</p>
          <h1 className="text-base font-semibold text-zinc-100 truncate">{firstName}</h1>
        </div>
        <div className="shrink-0">
          <PolicyDocumentsLink />
        </div>
      </div>

      {/* AI insight — conditional, no icon box */}
      <RiderInsight />

      {/* Platform disruption alert — conditional */}
      <PlatformStatus />

      {/* Predictive risk alert — conditional */}
      <PredictiveAlert />

      {/* Wallet — primary financial summary */}
      {policyIds.length > 0 ? (
        <RealtimeWallet
          profileId={user.id}
          initialBalance={totalPayouts}
          initialClaimCount={totalClaimCount}
          policyIds={policyIds}
          platform={profile?.platform ?? "zepto"}
        />
      ) : (
        <WalletCard
          balance={totalPayouts}
          platform={profile?.platform ?? "zepto"}
          claimCount={totalClaimCount}
          profileId={user.id}
        />
      )}

      {/* Active policy details */}
      <PolicyCard
        policy={activePolicy}
        profileId={user.id}
        claims={claimsFiltered}
        planName={planName}
        claimIdsNeedingVerification={claimIdsNeedingVerification}
      />

      {/* Live disruption feed */}
      <RiskRadar />

      {/* Claims history link */}
      {totalClaimCount > 0 && (
        <Link
          href="/dashboard/claims"
          className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3.5 hover:bg-zinc-800/50 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <History className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
              View all claims
            </span>
          </div>
          <span className="text-xs text-zinc-600">
            {totalClaimCount} total
          </span>
        </Link>
      )}

      {/* Report delivery impact */}
      <ReportDeliverySection />
    </div>
  );
}
