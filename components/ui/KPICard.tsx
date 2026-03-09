'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export type KPICardAccent = 'amber' | 'purple' | 'emerald' | 'blue' | 'red' | 'cyan' | 'violet';

const cardBgStyles: Record<KPICardAccent, string> = {
  amber: 'bg-[#c17d3a]/25 border-amber-500/20',
  purple: 'bg-[#7356BF]/25 border-[#7356BF]/30',
  emerald: 'bg-[#3AA76D]/25 border-[#3AA76D]/30',
  blue: 'bg-[#276EF1]/25 border-[#276EF1]/30',
  red: 'bg-[#D44333]/25 border-[#D44333]/30',
  cyan: 'bg-[#0ea5e9]/25 border-[#0ea5e9]/30',
  violet: 'bg-[#a78bfa]/25 border-[#a78bfa]/30',
};

const actionButtonStyles: Record<KPICardAccent, string> = {
  amber: 'bg-amber-600/40 hover:bg-amber-600/50 text-amber-100',
  purple: 'bg-[#7356BF]/40 hover:bg-[#7356BF]/50 text-violet-100',
  emerald: 'bg-[#3AA76D]/40 hover:bg-[#3AA76D]/50 text-emerald-100',
  blue: 'bg-[#276EF1]/40 hover:bg-[#276EF1]/50 text-blue-100',
  red: 'bg-[#D44333]/40 hover:bg-[#D44333]/50 text-red-100',
  cyan: 'bg-[#0ea5e9]/40 hover:bg-[#0ea5e9]/50 text-cyan-100',
  violet: 'bg-[#a78bfa]/40 hover:bg-[#a78bfa]/50 text-violet-100',
};

export interface KPICardProps {
  title: string;
  count?: number;
  label: string;
  value: string | number;
  accent: KPICardAccent;
  href?: string;
  /** Stagger index for motion delay */
  index?: number;
  className?: string;
}

export function KPICard({
  title,
  count,
  label,
  value,
  accent,
  href,
  index = 0,
  className = '',
}: KPICardProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-white/95">
        {title}
        {count !== undefined && <span className="text-white/80 font-normal"> ({count})</span>}
      </p>
      <p className="text-xs text-white/60 mt-0.5">{label}</p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <p className="text-xl font-bold text-white tabular-nums tracking-tight">{value}</p>
        {href ? (
          <Link
            href={href}
            aria-label={`View ${title}`}
            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${actionButtonStyles[accent]}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            aria-label={`View ${title}`}
            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${actionButtonStyles[accent]}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );

  const cardClass = `relative rounded-2xl border p-4 min-h-[120px] flex flex-col ${cardBgStyles[accent]} ${className}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.25 }}
      className={cardClass}
    >
      {content}
    </motion.div>
  );
}
