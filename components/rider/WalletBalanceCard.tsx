'use client';

import { useRealtime } from '@/components/rider/RealtimeProvider';
import { Card } from '@/components/ui/Card';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { ChevronRight, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRiderI18n } from './RiderI18nProvider';

interface WalletBalanceCardProps {
  initialBalance: number;
  weeklyChange: number;
  policyIds: string[];
  sparklineData?: number[];
  showAction?: boolean;
}

function GradientSparkline({ values }: { values: number[] }) {
  const data = values.length >= 2 ? values : [0, 0];
  const max = Math.max(...data, 1);
  const w = 200;
  const h = 40;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(58,167,109,0.3)" />
          <stop offset="100%" stopColor="rgba(58,167,109,0)" />
        </linearGradient>
        <linearGradient id="sparkStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(58,167,109,0.4)" />
          <stop offset="100%" stopColor="rgba(58,167,109,0.9)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkFill)" />
      <path
        d={linePath}
        fill="none"
        stroke="url(#sparkStroke)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Glow dot at the end */}
      {lastPoint && (
        <>
          <circle cx={lastPoint.x} cy={lastPoint.y} r="6" fill="rgba(58,167,109,0.2)" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill="#3AA76D" />
        </>
      )}
    </svg>
  );
}

function AnimatedBalance({ value, justUpdated }: { value: number; justUpdated: boolean }) {
  const motionValue = useMotionValue(value);
  const display = useTransform(motionValue, (v) => `₹${Math.round(v).toLocaleString('en-IN')}`);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: justUpdated ? 0.8 : 0.4,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value, justUpdated, motionValue]);

  return (
    <motion.p
      className={`text-2xl font-bold tabular-nums tracking-tight ${
        justUpdated ? 'text-uber-green' : 'text-white'
      }`}
    >
      {display}
    </motion.p>
  );
}

export function WalletBalanceCard({
  initialBalance,
  weeklyChange,
  policyIds: _policyIds,
  sparklineData,
  showAction = false,
}: WalletBalanceCardProps) {
  const { messages } = useRiderI18n();
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

  const changePercent =
    balance > 0 && weeklyChange > 0
      ? Math.round((weeklyChange / Math.max(balance - weeklyChange, 1)) * 100)
      : 0;

  return (
    <Card
      variant="default"
      padding="none"
      className={`overflow-hidden rounded-2xl border transition-all duration-500 ${
        justUpdated
          ? 'border-uber-green/40 shadow-[0_0_24px_rgba(58,167,109,0.15)]'
          : 'border-white/10'
      } bg-[#0c0c0c]`}
    >
      <div className="relative">
        {/* Mesh gradient background */}
        <div
          className="absolute inset-0 opacity-100 pointer-events-none rounded-2xl"
          style={{
            background:
              'radial-gradient(ellipse 120% 80% at 100% 0%, rgba(58,167,109,0.07) 0%, transparent 50%),' +
              'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(58,167,109,0.04) 0%, transparent 50%),' +
              'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 50%)',
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
                  {messages.dashboard.payoutBalance}
                </p>
                <AnimatedBalance value={balance} justUpdated={justUpdated} />
              </div>
            </div>
            {showAction && (
              <Link
                href="/dashboard/wallet"
                className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white transition-all min-h-[36px]"
              >
                {messages.dashboard.details}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {weeklyChange !== 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-medium text-uber-green tabular-nums">
                +₹{weeklyChange.toLocaleString('en-IN')}
              </span>
              {changePercent > 0 && (
                <span className="text-[10px] font-semibold text-uber-green/70 bg-uber-green/10 px-1.5 py-0.5 rounded-full tabular-nums">
                  ↑ {changePercent}%
                </span>
              )}
              <span className="text-[11px] text-zinc-500">{messages.dashboard.thisWeek}</span>
            </div>
          )}

          <div className="mt-2.5 min-h-[40px]">
            <GradientSparkline values={spark} />
          </div>
        </div>
      </div>
    </Card>
  );
}
