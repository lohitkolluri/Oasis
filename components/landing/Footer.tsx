import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-md relative z-10 reveal-in-up" style={{ '--d': '20ms' } as React.CSSProperties}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[400px]">
            <p className="text-[20px] font-bold tracking-[-0.04em] text-white">Oasis</p>
            <p className="mt-4 text-[14px] leading-relaxed text-white/50 tracking-tight">
              Income protection for delivery partners. Weekly cashflows. Automated parametric payouts.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-x-12 gap-y-10 text-[14px] sm:grid-cols-3">
            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">Product</p>
              <nav className="flex flex-col gap-3">
                <Link href="#faq" className="text-white/60 hover:text-white transition-colors">
                  FAQ
                </Link>
              </nav>
            </div>
            
            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">Access</p>
              <nav className="flex flex-col gap-3">
                <Link href="/login" className="text-white/60 hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link href="/register" className="text-white/60 hover:text-white transition-colors">
                  Get started
                </Link>
              </nav>
            </div>
            
            <div className="space-y-4 col-span-2 sm:col-span-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">Legal</p>
              <div className="flex flex-col gap-3">
                <span className="text-white/40">No health/life/accident coverage</span>
                <span className="text-white/40">No vehicle repair coverage</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-8 text-[13px] text-white/40">
          <div className="flex items-center gap-6">
            <span>© {new Date().getFullYear()} Oasis</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white/20 animate-pulse" />
            <span className="font-mono text-[11px] tracking-widest uppercase">Systems Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
