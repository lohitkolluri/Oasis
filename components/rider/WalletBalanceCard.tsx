'use client';

import { Card } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { ChevronRight, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRealtime } from '@/components/rider/RealtimeProvider';

interface WalletBalanceCardProps {
  initialBalance: number;
  weeklyChange: number;
  policyIds: string[];
  sparklineData?: number[];
  showAction?: boolean;
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
      className="w-full h-7 text-white/40"
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
  policyIds: _policyIds,
  sparklineData,
  showAction = false,
}: WalletBalanceCardProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [justUpdated, setJustUpdated] = useState(false);
  const seenClaimIds = useRef(new Set<string>());
  const { lastClaimEvent } = useRealtime();

  useEffect(() => {
    if (!lastClaimEvent) return;
    if (lastClaimEvent.status !== 'paid') return;
    if (seenClaimIds.current.has(lastClaimEvent.id)) return;
    seenClaimIds.current.add(lastClaimEvent.id);
    setBalance((b) => b + Number(lastClaimEvent.payout_amount_inr));
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 2500);
  }, [lastClaimEvent]);

  const spark =
    sparklineData && sparklineData.length > 0
      ? sparklineData
      : [0, balance * 0.3, balance * 0.5, balance * 0.8, balance];

  return (
    <Card
      variant="default"
      padding="none"
      className={`overflow-hidden rounded-2xl border transition-all duration-500 ${
        justUpdated ? 'border-uber-green/40 shadow-[0_0_24px_rgba(58,167,109,0.15)]' : 'border-white/10'
      } bg-[#0c0c0c]`}
    >
      <div className="relative">
      <div
        className="absolute inset-0 opacity-100 pointer-events-none rounded-2xl"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 100% 0%, rgba(255,255,255,0.05) 0%, transparent 50%),' +
            'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(58,167,109,0.06) 0%, transparent 50%)',
        }}
        aria-hidden
      />
      <div className="relative px-4 pt-4 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-uber-green/15 border border-uber-green/25 shrink-0">
              <Wallet className="h-5 w-5 text-uber-green" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Payout balance
              </p>
              <motion.p
                key={balance}
                initial={justUpdated ? { scale: 1.03, opacity: 0.9 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`text-2xl font-bold tabular-nums tracking-tight ${
                  justUpdated ? 'text-uber-green' : 'text-white'
                }`}
              >
                ₹{balance.toLocaleString('en-IN')}
              </motion.p>
            </div>
          </div>
          {showAction && (
            <Link
              href="/dashboard/wallet"
              className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white transition-colors min-h-[36px]"
            >
              Details
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {weeklyChange !== 0 && (
          <p className="text-xs font-medium mt-2 text-zinc-400">
            +₹{weeklyChange.toLocaleString('en-IN')} this week
          </p>
        )}

        <div className="mt-2.5 min-h-[28px]">
          <Sparkline values={spark} />
        </div>
      </div>
      </div>
    </Card>
  );
}
