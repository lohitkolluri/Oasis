"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";

interface RealtimeWalletProps {
  profileId: string;
  initialBalance: number;
  policyIds: string[];
  platform: string;
}

export function RealtimeWallet({
  profileId,
  initialBalance,
  policyIds,
  platform,
}: RealtimeWalletProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [claimCount, setClaimCount] = useState(
    Math.round(initialBalance / 400)
  );

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, policyIds]);

  return (
    <div className="rounded-2xl bg-zinc-900/90 border border-emerald-500/20 shadow-xl shadow-black/10 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Avatar seed={profileId} size={32} className="ring-1 ring-emerald-500/20" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-zinc-100">Coverage & Earnings</h2>
          <p className="text-xs text-zinc-500">Updates in real time</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
      <p className="text-3xl font-bold text-zinc-100 tracking-tight tabular-nums">
        ₹{balance.toLocaleString("en-IN")}
      </p>
      <div className="mt-5 pt-4 border-t border-zinc-800/60 flex justify-between items-center text-sm">
        <span className="text-zinc-500 capitalize">{platform}</span>
        {claimCount > 0 && (
          <span className="text-emerald-400/90 text-xs font-medium">
            {claimCount} claim{claimCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
