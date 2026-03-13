'use client';

import type { LucideIcon } from 'lucide-react';
import { Cloud, FileCheck, Flag, ShieldAlert, TrendingDown, TrendingUp, Users } from 'lucide-react';

type IconName = 'TrendingUp' | 'Cloud' | 'ShieldAlert' | 'Users' | 'FileCheck' | 'Flag';

const iconMap: Record<IconName, LucideIcon> = {
  TrendingUp,
  Cloud,
  ShieldAlert,
  Users,
  FileCheck,
  Flag,
};

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconName;
  accent?: 'default' | 'cyan' | 'violet' | 'emerald' | 'amber' | 'red';
  delay?: number;
  subtext?: string;
  trend?: { direction: 'up' | 'down'; label: string };
}

const accentMap: Record<string, { value: string; icon: string; badge: string }> = {
  default: {
    value: 'text-white',
    icon: 'bg-[#262626] text-[#737373]',
    badge: 'bg-[#262626] text-[#737373]',
  },
  cyan: {
    value: 'text-[#7dd3fc]',
    icon: 'bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20',
    badge: 'bg-[#7dd3fc]/10 text-[#7dd3fc]',
  },
  violet: {
    value: 'text-[#a78bfa]',
    icon: 'bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20',
    badge: 'bg-[#a78bfa]/10 text-[#a78bfa]',
  },
  emerald: {
    value: 'text-[#22c55e]',
    icon: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20',
    badge: 'bg-[#22c55e]/10 text-[#22c55e]',
  },
  amber: {
    value: 'text-[#f59e0b]',
    icon: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20',
    badge: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  },
  red: {
    value: 'text-[#ef4444]',
    icon: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20',
    badge: 'bg-[#ef4444]/10 text-[#ef4444]',
  },
};

export function StatCard({
  label,
  value,
  icon,
  accent = 'default',
  subtext,
  trend,
}: StatCardProps) {
  const Icon = iconMap[icon] ?? TrendingUp;
  const styles = accentMap[accent] ?? accentMap.default;

  return (
    <div className="relative bg-[#161616] border border-[#2d2d2d] rounded-xl p-5 overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-medium text-[#555] tracking-wide uppercase">
          {label}
        </span>
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${styles.icon}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <p
        className={`text-3xl font-bold tabular-nums tracking-tight leading-none ${styles.value}`}
      >
        {value}
      </p>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {subtext && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
            {subtext}
          </span>
        )}
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-medium ${
              trend.direction === 'up' ? 'text-[#22c55e]' : 'text-[#ef4444]'
            }`}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.label}
          </span>
        )}
      </div>
    </div>
  );
}
