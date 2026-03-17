'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, CloudRain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    k: 'Signals',
    title: 'Watch disruptions',
    desc: 'External triggers mapped to your zone.',
    Icon: CloudRain,
  },
  {
    k: 'Pricing',
    title: 'Weekly calculated',
    desc: 'Computed from zone + triggers + limits.',
    Icon: Calculator,
  },
  {
    k: 'Payout',
    title: 'Auto payouts',
    desc: 'No forms. No manual claims.',
    Icon: Sparkles,
  },
];

export function TourStripSection() {
  const [active, setActive] = useState(0);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setActive((a) => (a + 1) % steps.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Product tour
          </p>
          <h2 className="mt-3 text-[26px] sm:text-[30px] font-semibold tracking-[-0.04em] text-white">
            Three steps. One system.
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {steps.map((s, idx) => (
            <button
              key={s.k}
              type="button"
              onClick={() => setActive(idx)}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                idx === active ? 'bg-white/70' : 'bg-white/15 hover:bg-white/30',
              )}
              aria-label={`Go to ${s.k}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {steps.map((s, idx) => {
          const isActive = idx === active;
          return (
            <div
              key={s.k}
              className={cn(
                'relative rounded-[22px] border bg-white/[0.02] p-5 transition-colors',
                isActive ? 'border-white/15 bg-white/[0.03]' : 'border-white/10 hover:bg-white/[0.03]',
              )}
            >
              {isActive ? (
                <div
                  className="pointer-events-none absolute inset-0 rounded-[22px] opacity-100"
                  aria-hidden
                  style={{
                    background:
                      'radial-gradient(520px circle at 15% 15%, rgba(255,255,255,0.06), transparent 55%), radial-gradient(520px circle at 85% 85%, rgba(255,255,255,0.04), transparent 60%)',
                  }}
                />
              ) : null}

              <div className="relative flex items-start justify-between gap-4">
                <div className="h-10 w-10 rounded-2xl border border-white/10 bg-black/20 grid place-items-center">
                  <s.Icon className="h-5 w-5 text-white/65" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">
                  {s.k}
                </span>
              </div>

              <p className="relative mt-4 text-[14px] font-semibold tracking-[-0.02em] text-white/85">
                {s.title}
              </p>
              <p className="relative mt-1 text-[13px] leading-relaxed text-white/45">
                {s.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

