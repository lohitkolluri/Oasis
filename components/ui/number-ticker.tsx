'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface NumberTickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  startValue?: number;
  direction?: 'up' | 'down';
  delay?: number;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
}

/**
 * Animated number count-up/count-down (Magic UI style).
 * Animates when in view. Use for KPIs and stats.
 */
export function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  decimalPlaces = 0,
  prefix = '',
  suffix = '',
  format,
  className,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? value : startValue);
  const springValue = useSpring(motionValue, { damping: 50, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (!isInView) return;
    const t = setTimeout(() => {
      motionValue.set(direction === 'down' ? startValue : value);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [motionValue, isInView, delay, value, direction, startValue]);

  useEffect(() => {
    const unsub = springValue.on('change', (latest) => {
      if (!ref.current) return;
      const n = Number(latest.toFixed(decimalPlaces));
      const str = format
        ? format(n)
        : Intl.NumberFormat('en-IN', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(n);
      ref.current.textContent = str;
    });
    return unsub;
  }, [springValue, decimalPlaces, format]);

  const initialStr =
    format != null
      ? format(direction === 'down' ? value : startValue)
      : Intl.NumberFormat('en-IN', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(direction === 'down' ? value : startValue);

  return (
    <span className={cn('inline-block tabular-nums', className)} {...props}>
      {prefix}
      <span ref={ref}>{initialStr}</span>
      {suffix}
    </span>
  );
}
