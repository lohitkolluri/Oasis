'use client';

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative overflow-hidden rounded-3xl border transition-all duration-500 active:scale-[0.99] ${
        justUpdated
          ? 'border-uber-green/40 shadow-[0_0_32px_rgba(58,167,109,0.2)]'
          : 'border-white/10'
      }`}
    >
      {/* Background: subtle radial gradients + corner orb (no green–violet band) */}
      <div
        className="absolute inset-0 bg-surface-1"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-100"
        style={{
          background:
            'radial-gradient(ellipse 120% 100% at 100% 0%, rgba(255,255,255,0.06) 0%, transparent 50%),' +
            'radial-gradient(ellipse 80% 80% at 0% 100%, rgba(58,167,109,0.08) 0%, transparent 50%)',
        }}
        aria-hidden
      />
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
        aria-hidden
      />

      <div className="relative px-4 pt-4 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-uber-green/15 border border-uber-green/25 shrink-0">
              <Wallet className="h-[18px] w-[18px] text-uber-green" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                Payout balance
              </p>
              <motion.p
                key={balance}
                initial={justUpdated ? { scale: 1.05, opacity: 0.9 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`text-[28px] leading-tight font-bold tabular-nums tracking-tight text-white ${
                  justUpdated ? 'text-uber-green' : ''
                }`}
              >
                ₹{balance.toLocaleString('en-IN')}
              </motion.p>
            </div>
          </div>
          {showAction && (
            <Link
              href="/dashboard/wallet"
              className="shrink-0 flex items-center gap-1 rounded-full bg-black/30 hover:bg-black/40 active:bg-black/50 border border-white/10 px-3 py-2 text-xs font-medium text-white/90 transition-colors min-h-[36px]"
            >
              Details
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {weeklyChange !== 0 && (
          <p className="text-xs font-medium mt-1.5 text-white/70">
            {weeklyChange > 0 ? '+' : ''}₹{weeklyChange.toLocaleString('en-IN')} this week
          </p>
        )}

        <div className="mt-2.5 min-h-[28px]">
          <Sparkline values={spark} />
        </div>
      </div>
    </motion.div>
  );
}
