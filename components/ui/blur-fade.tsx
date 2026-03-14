'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  offset?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  inView?: boolean;
  inViewMargin?: string;
  blur?: string;
}

/**
 * Blur-in fade entrance animation (Magic UI style).
 * Use for sections and cards to reveal on scroll.
 */
export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 0.4,
  offset = 8,
  direction = 'up',
  inView = true,
  inViewMargin = '-24px',
  blur = '6px',
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inViewResult = useInView(ref, {
    once: true,
    margin: inViewMargin as Parameters<typeof useInView>[1] extends { margin?: infer M } ? M : never,
  });
  const isVisible = !inView || inViewResult;

  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const offsetVal = direction === 'right' || direction === 'down' ? -offset : offset;

  const variants: Variants = {
    hidden: {
      [axis]: offsetVal,
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      [axis]: 0,
      opacity: 1,
      filter: 'blur(0px)',
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={variants}
      transition={{
        delay: 0.02 + delay,
        duration,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
