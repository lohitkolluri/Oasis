'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Wallet } from 'lucide-react';

interface WalletBalanceCardProps {
  initialBalance: number;
  weeklyChange: number;
  policyIds: string[];
  /** Optional sparkline values (e.g. last 7 days). If not provided, uses placeholder. */
  sparklineData?: number[];
}

function Sparkline({ values }: { values: number[] }) {
  const data = values.length >= 2 ? values : [0, 0];
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-7 text-uber-green/60"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function WalletBalanceCard({
  initialBalance,
  weeklyChange,
  policyIds,
  sparklineData,
}: WalletBalanceCardProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [justUpdated, setJustUpdated] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (policyIds.length === 0) return;
    const channel = supabase
      .channel('wallet_balance_card')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'parametric_claims',
          filter: `policy_id=in.(${policyIds.join(',')})`,
        },
        (payload) => {
          const newClaim = payload.new as { payout_amount_inr: number };
          setBalance((b) => b + Number(newClaim.payout_amount_inr));
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 2500);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [policyIds]);

  const spark = sparklineData && sparklineData.length > 0
    ? sparklineData
    : [0, balance * 0.3, balance * 0.5, balance * 0.8, balance];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl overflow-hidden border transition-all duration-500 ${
        justUpdated
          ? 'bg-uber-green/10 border-uber-green/30 shadow-[0_0_24px_rgba(58,167,109,0.15)]'
          : 'bg-surface-1/90 border-white/10 backdrop-blur-sm'
      }`}
    >
      <div className="bg-gradient-to-br from-uber-green/10 via-transparent to-transparent px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-uber-green/90 uppercase tracking-wider">
            Wallet Balance
          </span>
          <Wallet className="h-4 w-4 text-uber-green/50" />
        </div>
        <motion.p
          key={balance}
          initial={{ scale: 1.05, opacity: 0.9 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`text-3xl font-bold tabular-nums tracking-tight text-white ${
            justUpdated ? 'text-uber-green' : ''
          }`}
        >
          ₹{balance.toLocaleString('en-IN')}
        </motion.p>
        {weeklyChange !== 0 && (
          <p className="text-xs font-medium mt-1 text-uber-green/90">
            {weeklyChange > 0 ? '+' : ''}₹{weeklyChange.toLocaleString('en-IN')} this week
          </p>
        )}
        <div className="mt-3 min-h-[28px]">
          <Sparkline values={spark} />
        </div>
      </div>
    </motion.div>
  );
}
