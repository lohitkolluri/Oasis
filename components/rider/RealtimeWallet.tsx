"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          Total Payouts Received
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
          <Activity className="h-3 w-3" />
          Live
        </span>
      </div>
      <div className="px-5 py-5">
        <p
          className={`text-[38px] font-bold tracking-tight tabular-nums leading-none transition-colors duration-500 ${
            justUpdated ? "text-emerald-400" : "text-zinc-100"
          }`}
        >
          ₹{balance.toLocaleString("en-IN")}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-zinc-600 capitalize">{platform}</span>
          {claimCount > 0 && (
            <span className="text-xs text-zinc-500 tabular-nums">
              {claimCount} parametric {claimCount === 1 ? "trigger" : "triggers"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
