"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wallet } from "lucide-react";

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
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="h-5 w-5 text-emerald-400" />
        <h2 className="font-semibold">Coverage & Earnings</h2>
        <span className="ml-auto text-xs text-emerald-400/80 animate-pulse">
          Live
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-zinc-100">
          ₹{balance.toLocaleString("en-IN")}
        </p>
        <p className="text-sm text-zinc-400">
          Total protected payouts (updates in real time)
        </p>
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between text-sm text-zinc-500">
        <span>Platform: {platform}</span>
        {claimCount > 0 && (
          <span>{claimCount} automated claim{claimCount !== 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );
}
