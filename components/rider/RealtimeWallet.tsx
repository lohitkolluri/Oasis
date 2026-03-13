"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet, Zap } from "lucide-react";
import { useRealtime } from "@/components/rider/RealtimeProvider";

interface RealtimeWalletProps {
  profileId: string;
  initialBalance: number;
  initialClaimCount: number;
  policyIds: string[];
  platform: string;
}

export function RealtimeWallet({
  profileId: _profileId,
  initialBalance,
  initialClaimCount,
  policyIds: _policyIds,
  platform,
}: RealtimeWalletProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [claimCount, setClaimCount] = useState(initialClaimCount);
  const [justUpdated, setJustUpdated] = useState(false);
  const seenClaimIds = useRef(new Set<string>());

  const { lastClaimEvent } = useRealtime();

  useEffect(() => {
    if (!lastClaimEvent) return;
    if (lastClaimEvent.status !== "paid") return;
    if (seenClaimIds.current.has(lastClaimEvent.id)) return;
    seenClaimIds.current.add(lastClaimEvent.id);
    setBalance((b) => b + Number(lastClaimEvent.payout_amount_inr));
    setClaimCount((c) => c + 1);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 2500);
  }, [lastClaimEvent]);

  return (
    <div className="rounded-[24px] bg-surface-1 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-uber-green/12">
            <Wallet className="text-uber-green" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Coverage & Earnings</p>
            <p className="text-[10px] text-zinc-500">Protected payouts</p>
          </div>
        </div>
      </div>

      {/* Balance hero */}
      <div className="px-5 pb-5">
        <div
          className={`mt-2 rounded-[16px] border px-5 py-5 transition-all duration-500 ${
            justUpdated
              ? "bg-uber-green/15 border-uber-green/30"
              : "bg-gradient-to-br from-uber-green/10 via-transparent to-transparent border-uber-green/10"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-uber-green/80 uppercase tracking-[0.12em] mb-1">
                Total payouts
              </p>
              <p
                className={`text-[36px] font-bold tabular-nums tracking-tight leading-none transition-all duration-500 ${
                  justUpdated ? "text-uber-green scale-[1.03]" : "text-white"
                }`}
              >
                ₹{balance.toLocaleString("en-IN")}
              </p>
            </div>
            {justUpdated && (
              <span className="flex items-center gap-1 text-[11px] text-uber-green font-semibold bg-uber-green/15 px-2.5 py-1 rounded-full border border-uber-green/25 animate-pulse">
                <Zap className="h-3 w-3" />
                New
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-zinc-500 capitalize font-medium">{platform}</span>
            {claimCount > 0 && (
              <span className="text-[11px] text-uber-green bg-uber-green/10 px-2.5 py-1 rounded-full font-semibold">
                {claimCount} {claimCount === 1 ? "trigger" : "triggers"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
