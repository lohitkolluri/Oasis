'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: 'none' | 'cyan' | 'violet';
  hover?: boolean;
  delay?: number;
  as?: 'div' | 'section' | 'article';
}

export function GlassCard({
  children,
  className = '',
  glow = 'none',
  hover = true,
  delay = 0,
  as: Tag = 'div',
}: GlassCardProps) {
  const glowClass = {
    none: '',
    cyan: 'shadow-neon-cyan border-[#7dd3fc]/20',
    violet: 'shadow-neon-violet border-[#a78bfa]/20',
  }[glow];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay }}
      className={`bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.03)] transition-all duration-200 ${
        hover ? 'hover:border-[#3a3a3a] hover:shadow-[0_0_25px_rgba(125,211,252,0.12)] hover:scale-[1.005]' : ''
      } ${glowClass} ${className}`}
    >
      {children}
    </motion.div>
  );
}
