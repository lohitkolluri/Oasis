import Link from 'next/link';
import {
  Calculator,
  CloudRain,
  Flame,
  MapPin,
  TrafficCone,
  Wind,
} from 'lucide-react';

type TriggerTile = {
  type: 'Weather' | 'Air quality' | 'Zone' | 'Traffic';
  name: string;
};

const TRIGGERS: TriggerTile[] = [
  { type: 'Weather', name: 'Heavy rain' },
  { type: 'Weather', name: 'Extreme heat' },
  { type: 'Air quality', name: 'Hazardous AQI' },
  { type: 'Zone', name: 'Lockdown / restriction' },
  { type: 'Traffic', name: 'Severe congestion' },
  { type: 'Zone', name: 'Curfew / closure' },
];

const WORD_CLOUD: Array<{
  text: string;
  gradient: string;
  x: string;
  y: string;
  rotate: string;
}> = [
  { text: 'Weekly calculated', gradient: 'from-white/30 to-transparent', x: 'left-8', y: 'top-10', rotate: '-rotate-6' },
  { text: 'Zone', gradient: 'from-white/20 to-transparent', x: 'right-12', y: 'top-14', rotate: 'rotate-6' },
  { text: 'Triggers', gradient: 'from-white/20 to-transparent', x: 'left-12', y: 'top-[44%]', rotate: 'rotate-3' },
  { text: 'Rain', gradient: 'from-white/25 to-transparent', x: 'right-12', y: 'top-[40%]', rotate: '-rotate-3' },
  { text: 'Heat', gradient: 'from-white/18 to-transparent', x: 'left-20', y: 'bottom-14', rotate: '-rotate-6' },
  { text: 'AQI', gradient: 'from-white/18 to-transparent', x: 'right-20', y: 'bottom-12', rotate: 'rotate-6' },
  { text: 'Coverage limits', gradient: 'from-white/16 to-transparent', x: 'left-1/2 -translate-x-1/2', y: 'bottom-10', rotate: 'rotate-0' },
];

function getTriggerTheme(t: TriggerTile) {
  const isRain = t.name.toLowerCase().includes('rain');
  const Icon = t.type === 'Weather' ? (isRain ? CloudRain : Flame) : t.type === 'Air quality' ? Wind : t.type === 'Traffic' ? TrafficCone : MapPin;
  return {
    Icon,
    ring: 'bg-white/[0.02] border-white/5 group-hover:bg-white/10 group-hover:border-white/30',
    iconColor: 'text-white/50 group-hover:text-white transition-colors',
  };
}

function TriggersPanel() {
  return (
    <div className="group relative rounded-3xl p-[1px] shadow-[0_0_80px_rgba(255,255,255,0.03)] overflow-hidden">
      <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite]" 
           style={{ background: 'conic-gradient(from 90deg at 50% 50%, transparent 70%, rgba(255,255,255,0.4) 100%)' }} />
      <div className="relative h-full w-full rounded-[23px] bg-[#0a0a0a] overflow-hidden flex flex-col">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"
          aria-hidden
        />

        <div className="px-6 pt-8 pb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Signals</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <h3 className="text-[26px] font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Available triggers</h3>
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/50 uppercase tracking-widest shadow-inner">
                Automated
              </span>
            </div>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-white/50 max-w-[60ch]">
            Pick what you want to monitor. Payouts trigger automatically with zero manual steps.
          </p>
        </div>

        <div className="border-t border-white/10 px-6 py-6 bg-[#050505] flex-grow">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 h-full">
            {TRIGGERS.map((t, idx) => {
              const { Icon, ring, iconColor } = getTriggerTheme(t);
              return (
                <div
                  key={`${t.type}-${t.name}-${idx}`}
                  className={[
                    idx >= 4 ? 'hidden sm:flex' : 'flex',
                    'group/card relative rounded-2xl border border-white/5 bg-[#0a0a0a] p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(255,255,255,0.05)] hover:bg-white/[0.04] hover:border-white/20 min-h-[140px] sm:min-h-[160px] flex-col items-center justify-center',
                  ].join(' ')}
                  title={t.name}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
                    aria-hidden
                    style={{
                      background:
                        'radial-gradient(420px circle at 50% 50%, rgba(255,255,255,0.03), transparent 60%)',
                    }}
                  />

                  <div className="relative flex flex-col items-center justify-center gap-5 py-2">
                    <div className={`relative h-14 w-14 rounded-full border ${ring} transition-all duration-500 group-hover/card:scale-110`}>
                      <div className="absolute inset-0 rounded-full opacity-0 animate-[pulse_2.8s_ease-in-out_infinite] bg-white/[0.04]" />
                      <div className="absolute inset-0 grid place-items-center">
                        <Icon className={`h-6 w-6 ${iconColor} transition-transform duration-500 group-hover/card:scale-110`} />
                      </div>
                    </div>
                    <p className="text-[13px] font-bold tracking-tight text-white/80 text-center leading-tight group-hover/card:text-white transition-colors">
                      {t.name}
                    </p>
                    <span className="sr-only">{t.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingPanel() {
  return (
    <div className="group relative rounded-3xl p-[1px] shadow-[0_0_80px_rgba(255,255,255,0.03)] overflow-hidden">
      <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite]" 
           style={{ background: 'conic-gradient(from 180deg at 50% 50%, transparent 70%, rgba(255,255,255,0.4) 100%)' }} />
      <div className="relative h-full w-full rounded-[23px] bg-[#0a0a0a] overflow-hidden flex flex-col">
        <div className="px-6 pt-8 pb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Weekly pricing</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <h3 className="text-[26px] font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Quote preview</h3>
            <Link href="/register" className="text-[12px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors">
              Get started
            </Link>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-white/50 max-w-[60ch]">
            Pricing is defined by <span className="text-white/80">zone</span>, <span className="text-white/80">triggers</span>, and{' '}
            <span className="text-white/80">coverage limits</span>.
          </p>
        </div>

        <div className="group/pricing relative border-t border-white/10 bg-[#050505] px-6 py-8 sm:py-10 overflow-hidden min-h-[240px] sm:min-h-[320px] flex items-center justify-center flex-grow">
          <div
            className="pointer-events-none absolute inset-0 opacity-0 group-hover/pricing:opacity-100 transition-opacity duration-1000"
            aria-hidden
            style={{
              background:
                'radial-gradient(760px circle at 50% 50%, rgba(255,255,255,0.03), transparent 60%)',
            }}
          />

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            aria-hidden
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
            }}
          />

          <div
            className="pointer-events-none absolute right-6 top-10 hidden sm:block text-[160px] font-bold leading-none tracking-[-0.06em] text-white/[0.02]"
            aria-hidden
          >
            ₹
          </div>

          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {WORD_CLOUD.map((w) => (
              <div
                key={w.text}
                className={`absolute hidden sm:block ${w.x} ${w.y} ${w.rotate} select-none whitespace-nowrap text-[18px] font-bold tracking-tight text-transparent bg-gradient-to-r ${w.gradient} bg-clip-text`}
              >
                {w.text}
              </div>
            ))}
          </div>

          <div className="relative transition-transform duration-700 hover:scale-110 hover:rotate-3">
            <div className="relative h-28 w-28 rounded-2xl border border-white/20 bg-black/60 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
              <div className="absolute inset-0 border border-white/10 opacity-0 animate-[pulse_2.8s_ease-in-out_infinite] bg-white/5 rounded-2xl" />
              <div className="absolute inset-0 grid place-items-center">
                <Calculator className="h-10 w-10 text-white transition-transform duration-500 animate-[float_3.6s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoverageBoundary({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-[#0a0a0a] p-6 sm:p-10 transition-colors hover:border-white/20 hover:bg-[#0c0c0c] ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Coverage boundary</p>
          <p className="mt-4 text-[24px] sm:text-[28px] font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
            Income protection only.
          </p>
          <p className="mt-2 max-w-[80ch] text-[15px] leading-relaxed text-white/50">
            Oasis is designed for loss of income from external disruptions. It does not cover health, life, accidents, or vehicle repairs.
          </p>
        </div>
        <Link
          href="#faq"
          className="group inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
        >
          Read FAQ
        </Link>
      </div>
    </div>
  );
}

export function MiddleSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-20 relative z-10">
      <div className="grid gap-8 lg:grid-cols-2 reveal-in-up" style={{ ['--d' as any]: '60ms' }}>
        <TriggersPanel />
        <div className="space-y-8 flex flex-col">
          <PricingPanel />
          <CoverageBoundary className="flex-grow" />
        </div>
      </div>
    </section>
  );
}
