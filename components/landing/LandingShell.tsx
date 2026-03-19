'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export function LandingShell({ children }: { children: ReactNode }) {
  const { scrollY } = useScroll();

  // Create different parallax speeds for the background elements
  // The further away a blob is supposed to be, the slower it moves (closer to 0)
  // Negative values mean it scrolls up as you scroll down
  const yBlob1 = useTransform(scrollY, [0, 3000], [0, -300]);
  const yBlob2 = useTransform(scrollY, [0, 3000], [0, -500]);
  const yBlob3 = useTransform(scrollY, [0, 3000], [0, -200]);
  const yGrid = useTransform(scrollY, [0, 3000], [0, -100]);

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Overlay Noise Texture - Static */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay z-0 fixed"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      {/* Parallax Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div 
          style={{ y: yBlob1 }}
          className="absolute -top-[30%] left-1/2 h-[60rem] w-[80rem] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_60%)] blur-3xl opacity-70 animate-[pulse_12s_ease-in-out_infinite]" 
        />
        <motion.div 
          style={{ y: yBlob2 }}
          className="absolute -bottom-[20%] -left-[10%] h-[50rem] w-[50rem] rounded-[100%] bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_60%)] blur-3xl animate-[pulse_8s_ease-in-out_infinite]" 
        />
        <motion.div 
          style={{ y: yBlob3 }}
          className="absolute top-[40%] -right-[20%] h-[60rem] w-[60rem] rounded-[100%] bg-[radial-gradient(circle,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_60%)] blur-3xl opacity-60 animate-[pulse_10s_ease-in-out_infinite_2s]" 
        />
        
        {/* Subtle dot field (no images) - Static */}
        <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px] fixed" />

        {/* App grid guides moving slowly on Parallax */}
        <motion.div
          style={{ y: yGrid }}
          className="absolute inset-0 opacity-[0.05] h-[150%] top-0"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '96px 96px',
              maskImage:
                'radial-gradient(70% 55% at 50% 18%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 82%)',
              WebkitMaskImage:
                'radial-gradient(70% 55% at 50% 18%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 82%)',
            }}
          />
        </motion.div>
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}
