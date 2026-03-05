"use client";

import { useEffect, useState } from "react";
import { Wallet, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  policyIds,
  platform,
}: RealtimeWalletProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [claimCount, setClaimCount] = useState(initialClaimCount);
  const [justUpdated, setJustUpdated] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (policyIds.length === 0) return;

    const channel = supabase
      .channel("parametric_claims")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "parametric_claims",
          filter: `policy_id=in.(${policyIds.join(",")})`,
        },
        (payload) => {
          const newClaim = payload.new as { payout_amount_inr: number };
          setBalance((b) => b + Number(newClaim.payout_amount_inr));
          setClaimCount((c) => c + 1);
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 2500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, policyIds]);

  return (
    <div className="rounded-[24px] bg-[#111820] border border-[#1e2535]/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-emerald-500/12">
            <Wallet className="text-emerald-400" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Coverage & Earnings</p>
            <p className="text-[10px] text-[#606880]">Protected payouts</p>
          </div>
        </div>
        {/* Live pill */}
        <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Balance hero */}
      <div className="px-5 pb-5">
        <div
          className={`mt-2 rounded-[16px] border px-5 py-5 transition-all duration-500 ${
            justUpdated
              ? "bg-emerald-500/15 border-emerald-500/30"
              : "bg-gradient-to-br from-emerald-500/8 via-transparent to-transparent border-emerald-500/10"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-400/70 uppercase tracking-[0.12em] mb-1">
                Total payouts
              </p>
              <p
                className={`text-[36px] font-bold tabular-nums tracking-tight leading-none transition-all duration-500 ${
                  justUpdated ? "text-emerald-300 scale-[1.03]" : "text-white"
                }`}
              >
                ₹{balance.toLocaleString("en-IN")}
              </p>
            </div>
            {justUpdated && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-semibold bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/25 animate-pulse">
                <Zap className="h-3 w-3" />
                New
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-[#606880] capitalize font-medium">{platform}</span>
            {claimCount > 0 && (
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-semibold">
                {claimCount} {claimCount === 1 ? "trigger" : "triggers"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
