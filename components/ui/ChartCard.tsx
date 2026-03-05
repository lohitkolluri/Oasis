'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  delay?: number;
  headerRight?: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
  delay = 0,
  headerRight,
}: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      className={`bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.03)] transition-all duration-200 hover:border-[#3a3a3a] hover:shadow-[0_0_24px_rgba(125,211,252,0.07)] ${className}`}
    >
      <div className="px-5 py-4 border-b border-[#2d2d2d] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 text-[#666666]" />}
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{title}</p>
            {subtitle && <p className="text-[10px] text-[#666666] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className="p-5">
        {children}
      </div>
    </motion.div>
  );
}
