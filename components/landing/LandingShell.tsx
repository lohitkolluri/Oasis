import type { ReactNode } from 'react';

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0f0f0f] text-white">
      {/* App-consistent backdrop: blooms + subtle grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-[30%] left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_55%)] blur-2xl" />
        <div className="absolute -bottom-[35%] left-[10%] h-[44rem] w-[44rem] rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.05)_0%,rgba(125,211,252,0)_60%)] blur-2xl" />
        {/* Subtle dot field (no images) */}
        <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* App grid guides (match admin/dashboard subtlety) */}
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(45,45,45,0.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(45,45,45,0.5) 1px, transparent 1px)',
            backgroundSize: '96px 96px',
            maskImage:
              'radial-gradient(70% 55% at 50% 18%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 82%)',
            WebkitMaskImage:
              'radial-gradient(70% 55% at 50% 18%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 82%)',
          }}
        />
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}

