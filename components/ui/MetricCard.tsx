'use client';

import { InlineHelp } from '@/components/ui/inline-help';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'default' | 'cyan' | 'violet' | 'emerald' | 'amber' | 'red';
  delay?: number;
  subtext?: string;
  /** Hover/focus ? tooltip explaining the metric for new operators */
  help?: string;
  trend?: { direction: 'up' | 'down'; label: string };
}

const accentMap = {
  default: {
    value: 'text-white',
    icon: 'bg-[#262626] text-[#737373]',
    bar: 'bg-white/10',
    badge: 'bg-[#262626] text-[#737373]',
  },
  cyan: {
    value: 'text-[#7dd3fc]',
    icon: 'bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20',
    bar: 'bg-[#7dd3fc]/20',
    badge: 'bg-[#7dd3fc]/10 text-[#7dd3fc]',
  },
  violet: {
    value: 'text-[#a78bfa]',
    icon: 'bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20',
    bar: 'bg-[#a78bfa]/20',
    badge: 'bg-[#a78bfa]/10 text-[#a78bfa]',
  },
  emerald: {
    value: 'text-[#22c55e]',
    icon: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20',
    bar: 'bg-[#22c55e]/20',
    badge: 'bg-[#22c55e]/10 text-[#22c55e]',
  },
  amber: {
    value: 'text-[#f59e0b]',
    icon: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20',
    bar: 'bg-[#f59e0b]/20',
    badge: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  },
  red: {
    value: 'text-[#ef4444]',
    icon: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20',
    bar: 'bg-[#ef4444]/20',
    badge: 'bg-[#ef4444]/10 text-[#ef4444]',
  },
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  accent = 'default',
  delay = 0,
  subtext,
  help,
  trend,
}: MetricCardProps) {
  const styles = accentMap[accent] ?? accentMap.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      whileHover={{ scale: 1.01, boxShadow: '0 0 25px rgba(125, 211, 252, 0.12)' }}
      className="relative cursor-default rounded-2xl border border-[#2d2d2d] bg-[#161616]/80 p-5 shadow-[0_0_20px_rgba(255,255,255,0.03)] backdrop-blur transition-all hover:border-[#3a3a3a] overflow-visible"
    >
      {/* Top accent line */}
      {accent !== 'default' && (
        <div className={`absolute top-0 left-0 right-0 h-px ${styles.bar}`} />
      )}

      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="text-[11px] font-medium tracking-wide text-[#666666] uppercase">{label}</span>
          {help ? <InlineHelp text={help} size="sm" className="translate-y-px" /> : null}
        </div>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <p className={`text-3xl font-bold font-display tabular-nums tracking-tight leading-none ${styles.value}`}>
        {value}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {subtext && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
            {subtext}
          </span>
        )}
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
            trend.direction === 'up' ? 'text-[#22c55e]' : 'text-[#ef4444]'
          }`}>
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.label}
          </span>
        )}
      </div>
    </motion.div>
  );
}
