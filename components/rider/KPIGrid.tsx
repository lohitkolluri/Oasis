'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  FileCheck,
  Shield,
  AlertTriangle,
} from 'lucide-react';

export interface KPIMetric {
  id: string;
  icon: React.ReactNode;
  title: string;
  value: string | number;
  progressPct: number; // 0–100
  accent: 'emerald' | 'sky' | 'amber' | 'red' | 'uber-green' | 'uber-blue' | 'uber-yellow' | 'uber-red';
}

const accentStyles = {
  emerald: 'bg-uber-green/12 text-uber-green border-uber-green/20',
  sky: 'bg-uber-blue/12 text-uber-blue border-uber-blue/20',
  amber: 'bg-uber-yellow/12 text-uber-yellow border-uber-yellow/20',
  red: 'bg-uber-red/12 text-uber-red border-uber-red/20',
  'uber-green': 'bg-uber-green/12 text-uber-green border-uber-green/20',
  'uber-blue': 'bg-uber-blue/12 text-uber-blue border-uber-blue/20',
  'uber-yellow': 'bg-uber-yellow/12 text-uber-yellow border-uber-yellow/20',
  'uber-red': 'bg-uber-red/12 text-uber-red border-uber-red/20',
};

const progressColors = {
  emerald: 'bg-uber-green',
  sky: 'bg-uber-blue',
  amber: 'bg-uber-yellow',
  red: 'bg-uber-red',
  'uber-green': 'bg-uber-green',
  'uber-blue': 'bg-uber-blue',
  'uber-yellow': 'bg-uber-yellow',
  'uber-red': 'bg-uber-red',
};

interface KPIGridProps {
  totalEarnings: number;
  claimsPaid: number;
  hasActiveCoverage: boolean;
  riskLevel: 'low' | 'medium' | 'high'; // or number 1–10
}

export function KPIGrid({
  totalEarnings,
  claimsPaid,
  hasActiveCoverage,
  riskLevel,
}: KPIGridProps) {
  const riskPct =
    riskLevel === 'high' ? 85 : riskLevel === 'medium' ? 50 : 20;
  const riskLabel =
    riskLevel === 'high' ? 'High' : riskLevel === 'medium' ? 'Medium' : 'Low';

  const metrics: KPIMetric[] = [
    {
      id: 'earnings',
      icon: <TrendingUp className="h-4 w-4" />,
      title: 'Total Earnings',
      value: `₹${totalEarnings.toLocaleString('en-IN')}`,
      progressPct: Math.min(100, (totalEarnings / 5000) * 100),
      accent: 'emerald',
    },
    {
      id: 'claims',
      icon: <FileCheck className="h-4 w-4" />,
      title: 'Claims Paid',
      value: claimsPaid,
      progressPct: Math.min(100, claimsPaid * 25),
      accent: 'sky',
    },
    {
      id: 'coverage',
      icon: <Shield className="h-4 w-4" />,
      title: 'Active Coverage',
      value: hasActiveCoverage ? 'Yes' : 'No',
      progressPct: hasActiveCoverage ? 100 : 0,
      accent: hasActiveCoverage ? 'emerald' : 'amber',
    },
    {
      id: 'risk',
      icon: <AlertTriangle className="h-4 w-4" />,
      title: 'Risk Level',
      value: riskLabel,
      progressPct: riskPct,
      accent: riskLevel === 'high' ? 'red' : riskLevel === 'medium' ? 'amber' : 'emerald',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.3 }}
          className="rounded-xl border border-white/10 bg-surface-1 p-4 active:scale-[0.98] transition-transform"
        >
          <div
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${accentStyles[m.accent]} mb-2.5`}
          >
            {m.icon}
          </div>
          <p className="text-[11px] font-medium text-zinc-500 mb-0.5">{m.title}</p>
          <p className="text-lg font-bold text-white tabular-nums tracking-tight">
            {m.value}
          </p>
          <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${m.progressPct}%` }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              className={`h-full rounded-full ${progressColors[m.accent]}`}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
