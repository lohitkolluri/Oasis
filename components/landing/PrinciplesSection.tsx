'use client';
import React from 'react';

import { useRef, useState } from 'react';

function HoverCard({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
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
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-[#070707] transition-all duration-500 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(255,255,255,0.05)] ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.06), transparent 40%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

const principles = [
  { t: 'No claims', d: 'When thresholds match, payouts are created automatically.' },
  { t: 'Weekly by design', d: 'Coverage and pricing align to weekly rider cashflows.' },
  { t: 'External disruptions only', d: 'Income loss from weather and zone-level restrictions. Not health, life, accidents, or vehicle repairs.' },
];

export function PrinciplesSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:py-32 relative z-10">
      <div className="flex flex-col items-center text-center reveal-in-up mb-16" style={{ '--d': '60ms' } as React.CSSProperties}>
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/40 mb-4">
          Principles
        </p>
        <h2 className="text-[32px] sm:text-[42px] font-bold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 leading-tight">
          Opinionated and simple.
        </h2>
        <p className="mt-4 max-w-[600px] text-[16px] leading-relaxed text-white/50 tracking-tight">
          Keep it simple. Weekly windows, clear limits, and automated payouts. Coverage is strictly for income loss from external disruptions.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {principles.map((p, idx) => (
          <HoverCard key={p.t} className="p-8 reveal-in-up" style={{ '--d': `${(idx + 1) * 100}ms` } as React.CSSProperties}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 mb-6 text-white/40 font-mono text-[12px] transition-transform duration-500 group-hover:scale-110 group-hover:text-white">
              0{idx + 1}
            </div>
            <h3 className="text-[20px] font-bold tracking-tight text-white mb-3 group-hover:text-white transition-colors">
              {p.t}
            </h3>
            <p className="text-[15px] leading-relaxed text-white/50">
              {p.d}
            </p>
          </HoverCard>
        ))}
      </div>
    </section>
  );
}
