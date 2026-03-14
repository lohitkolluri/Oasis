'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  reverse?: boolean;
  className?: string;
}

/**
 * Subtle animated border beam (Magic UI / Aceternity style).
 * Thin gradient sweep along the top edge. Oasis accents (cyan → violet).
 */
export function BorderBeam({
  size = 120,
  duration = 4,
  delay = 0,
  colorFrom = '#7dd3fc',
  colorTo = '#a78bfa',
  reverse = false,
  className,
}: BorderBeamProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden', className)}
      aria-hidden
    >
      <div className="absolute inset-x-0 top-0 h-[1px] overflow-hidden">
        <motion.div
          className="absolute top-0 h-full"
          style={{
            width: size,
            background: `linear-gradient(90deg, transparent, ${colorFrom}, ${colorTo}, transparent)`,
            opacity: 0.5,
          }}
          initial={{ x: reverse ? '100%' : '-100%' }}
          animate={{ x: reverse ? '-100%' : '100%' }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'linear',
            delay,
          }}
        />
      </div>
    </div>
  );
}
