'use client';

import { cn } from '@/lib/utils';
import { CircleHelp } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export type InlineHelpProps = {
  /** Shown in the tooltip; newline characters become line breaks */
  text: string;
  className?: string;
  size?: 'sm' | 'md';
};

const TOOLTIP_MAX_PX = 352; // ~22rem
const EST_HEIGHT = 200;
const MARGIN = 8;

/**
 * Compact ? control — tooltip is portaled to `document.body` with `position: fixed`
 * so it stacks above sibling cards (grid/flex) and Framer Motion layers.
 */
export function InlineHelp({ text, className, size = 'md' }: InlineHelpProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(TOOLTIP_MAX_PX, vw - 16);
    let left = rect.left;
    if (left + width > vw - MARGIN) left = vw - width - MARGIN;
    if (left < MARGIN) left = MARGIN;

    let top = rect.bottom + MARGIN;
    if (top + EST_HEIGHT > vh - MARGIN && rect.top > EST_HEIGHT + MARGIN) {
      top = rect.top - EST_HEIGHT - MARGIN;
    }
    if (top < MARGIN) top = rect.bottom + MARGIN;

    setCoords({ top, left });
  }, []);

  const openTooltip = useCallback(() => {
    measure();
    setOpen(true);
  }, [measure]);

  const closeTooltip = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onScroll = () => measure();
    const onResize = () => measure();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, measure, text]);

  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';

  const tooltipNode =
    open && mounted ? (
      <div
        id={id}
        role="tooltip"
        style={{
          top: coords.top,
          left: coords.left,
        }}
        className={cn(
          'pointer-events-none fixed z-[100000] max-w-[min(22rem,calc(100vw-1rem))] rounded-lg border border-white/10 bg-[#1c1c1c] px-3 py-2.5 text-left text-[12px] leading-relaxed text-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.55)]',
        )}
      >
        <span className="whitespace-pre-line">{text}</span>
      </div>
    ) : null;

  return (
    <>
      <span className={cn('relative inline-flex shrink-0', className)}>
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            'rounded-full p-0.5 text-white/35 outline-none transition-colors',
            'hover:text-[#7dd3fc] focus-visible:text-[#7dd3fc] focus-visible:ring-2 focus-visible:ring-[#7dd3fc]/35',
          )}
          aria-describedby={open ? id : undefined}
          aria-expanded={open}
          aria-label="Help"
          onMouseEnter={openTooltip}
          onMouseLeave={closeTooltip}
          onFocus={openTooltip}
          onBlur={closeTooltip}
        >
          <CircleHelp className={iconClass} aria-hidden />
        </button>
      </span>
      {tooltipNode && typeof document !== 'undefined'
        ? createPortal(tooltipNode, document.body)
        : null}
    </>
  );
}
