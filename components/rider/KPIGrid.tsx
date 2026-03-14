'use client';

import { Card } from '@/components/ui/Card';
import { TrendingUp, FileCheck, Shield, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface KPIGridProps {
  totalEarnings: number;
  claimsPaid: number;
  hasActiveCoverage: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export function KPIGrid({
  totalEarnings,
  claimsPaid,
  hasActiveCoverage,
  riskLevel,
}: KPIGridProps) {
  const riskLabel = riskLevel === 'high' ? 'High' : riskLevel === 'medium' ? 'Medium' : 'Low';
  const riskColor =
    riskLevel === 'high'
      ? 'text-red-400'
      : riskLevel === 'medium'
        ? 'text-amber-400'
        : 'text-sky-400';

  const items = [
    {
      id: 'earnings',
      title: 'Total Earnings',
      value: `₹${totalEarnings.toLocaleString('en-IN')}`,
      label: 'This period',
      icon: TrendingUp,
      accent: 'text-amber-400',
    },
    {
      id: 'claims',
      title: 'Claims Paid',
      value: claimsPaid,
      label: 'Claims',
      icon: FileCheck,
      accent: 'text-violet-400',
    },
    {
      id: 'coverage',
      title: 'Active Coverage',
      value: hasActiveCoverage ? 'Active' : 'None',
      label: 'Status',
      icon: Shield,
      accent: hasActiveCoverage ? 'text-uber-green' : 'text-zinc-500',
    },
    {
      id: 'risk',
      title: 'Risk Level',
      value: riskLabel,
      label: 'Zone risk',
      icon: AlertTriangle,
      accent: riskColor,
    },
  ];

  return (
    <Card
      variant="default"
      padding="none"
      className="rounded-2xl border border-white/10 bg-[#0c0c0c] overflow-hidden"
    >
      <div className="grid grid-cols-2 gap-px bg-white/5">
        {items.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="bg-[#0c0c0c] p-3.5 flex flex-col min-h-[88px]"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${m.accent}`} />
                <span className="text-xs font-medium text-zinc-500 truncate">
                  {m.title}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mb-0.5">{m.label}</p>
              <p
                className={`text-lg font-bold tabular-nums tracking-tight mt-auto ${m.accent}`}
              >
                {typeof m.value === 'number' ? m.value : m.value}
              </p>
            </div>
          );
        })}
      </div>
      <Link
        href="/dashboard/wallet"
        className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 border-t border-white/10 transition-colors"
      >
        View wallet details
        <span className="text-zinc-600">→</span>
      </Link>
    </Card>
  );
}
