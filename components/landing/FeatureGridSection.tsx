'use client';
import React from 'react';

import { CloudRain, ShieldCheck, Sparkles, Activity } from 'lucide-react';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

function SpotlightCard({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      style={style}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-[#070707] transition-all hover:border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)] ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.08), transparent 40%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export function FeatureGridSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32 relative z-10">
      <div className="max-w-[800px] mx-auto text-center mb-16 sm:mb-24 reveal-in-up" style={{ '--d': '40ms' } as React.CSSProperties}>
        <h2 className="text-[32px] sm:text-[48px] font-bold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 leading-[1.1]">
          A new species of insurance tool.
        </h2>
        <p className="mt-6 text-[18px] text-white/50 tracking-tight font-medium max-w-[600px] mx-auto">
          Built for modern income protection with parametric automation at its core. Say goodbye to manual claims.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px] sm:auto-rows-[320px]">
        {/* Main Bento Feature (Spans 2 columns on desktop) */}
        <SpotlightCard className="md:col-span-2 flex flex-col justify-between p-8 sm:p-10 reveal-in-up" style={{ '--d': '100ms' } as React.CSSProperties}>
          <div className="flex justify-end mb-8 sm:mb-12">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="max-w-xl">
            <h3 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.03em] mb-4 leading-tight">
              Built for automation
            </h3>
            <p className="text-[15px] sm:text-[16px] leading-relaxed text-white/50">
              Trigger signals decide eligibility globally. Payout computations are created automatically the exact second limits are breached. No adjusters.
            </p>
          </div>
        </SpotlightCard>

        {/* Small Feature */}
        <SpotlightCard className="flex flex-col p-8 reveal-in-up" style={{ '--d': '200ms' } as React.CSSProperties}>
          <div className="mb-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1">
              <CloudRain className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-[20px] font-bold text-white tracking-tight mb-2">Powered by signals</h3>
            <p className="text-[14px] leading-relaxed text-white/50">
              External weather, temperature, and AQI disruption indicators drive all trigger events cleanly.
            </p>
          </div>
        </SpotlightCard>

        {/* Small Feature */}
        <SpotlightCard className="flex flex-col p-8 reveal-in-up" style={{ '--d': '300ms' } as React.CSSProperties}>
          <div className="mb-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-[20px] font-bold text-white tracking-tight mb-2">Designed for clarity</h3>
            <p className="text-[14px] leading-relaxed text-white/50">
              Simple weekly evaluation windows. Crystal clear limits. Predictable wallet outcomes instantly.
            </p>
          </div>
        </SpotlightCard>

        {/* Wide Feature */}
        <SpotlightCard className="md:col-span-2 flex flex-col p-8 sm:p-10 reveal-in-up overflow-hidden" style={{ '--d': '400ms' } as React.CSSProperties}>
          <div className="absolute inset-0 right-0 top-0 w-full opacity-30 select-none pointer-events-none" style={{ backgroundImage: 'radial-gradient(1px 1px at 20px 20px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black">
                <Activity className="h-4 w-4" />
              </div>
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/50">Live Matrix</p>
            </div>
            <h3 className="text-[28px] sm:text-[32px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40 tracking-tight leading-tight max-w-[500px]">
              Continuous monitoring infrastructure validating safety 24/7.
            </h3>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}
