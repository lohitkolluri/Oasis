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
  { text: 'Weekly calculated', gradient: 'from-sky-300/30 to-transparent', x: 'left-8', y: 'top-10', rotate: '-rotate-6' },
  { text: 'Zone', gradient: 'from-white/18 to-transparent', x: 'right-12', y: 'top-14', rotate: 'rotate-6' },
  { text: 'Triggers', gradient: 'from-white/16 to-transparent', x: 'left-12', y: 'top-[44%]', rotate: 'rotate-3' },
  { text: 'Rain', gradient: 'from-sky-300/26 to-transparent', x: 'right-12', y: 'top-[40%]', rotate: '-rotate-3' },
  { text: 'Heat', gradient: 'from-amber-300/18 to-transparent', x: 'left-20', y: 'bottom-14', rotate: '-rotate-6' },
  { text: 'AQI', gradient: 'from-emerald-300/18 to-transparent', x: 'right-20', y: 'bottom-12', rotate: 'rotate-6' },
  { text: 'Coverage limits', gradient: 'from-violet-300/16 to-transparent', x: 'left-1/2 -translate-x-1/2', y: 'bottom-10', rotate: 'rotate-0' },
];

function getTriggerTheme(t: TriggerTile) {
  if (t.type === 'Weather') {
    const isRain = t.name.toLowerCase().includes('rain');
    return {
      Icon: isRain ? CloudRain : Flame,
      ring: 'bg-sky-500/10 border-sky-500/20',
      iconColor: 'text-sky-200',
    };
  }
  if (t.type === 'Air quality') {
    return { Icon: Wind, ring: 'bg-emerald-500/10 border-emerald-500/20', iconColor: 'text-emerald-200' };
  }
  if (t.type === 'Traffic') {
    return { Icon: TrafficCone, ring: 'bg-amber-500/10 border-amber-500/20', iconColor: 'text-amber-200' };
  }
  return { Icon: MapPin, ring: 'bg-violet-500/10 border-violet-500/20', iconColor: 'text-violet-200' };
}

function TriggersPanel() {
  return (
    <div className="relative rounded-[28px] border border-[#2d2d2d] bg-[#101010] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_26px_70px_rgba(0,0,0,0.55)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent"
        aria-hidden
      />

      <div className="px-6 pt-6 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Signals</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-white">Available triggers</h3>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/50">
              Automated
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/50">
              Weekly windows
            </span>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-white/45 max-w-[60ch]">
          Pick what you want to monitor · payouts trigger automatically.
        </p>
      </div>

      <div className="border-t border-[#2d2d2d] px-5 py-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TRIGGERS.map((t, idx) => {
            const { Icon, ring, iconColor } = getTriggerTheme(t);
            return (
              <div
                key={`${t.type}-${t.name}-${idx}`}
                className={[
                  idx >= 4 ? 'hidden sm:flex' : 'flex',
                  'group relative rounded-2xl border border-[#2d2d2d] bg-black/20 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-colors hover:bg-white/[0.02] hover:border-white/15 min-h-[140px] sm:min-h-[168px] flex-col items-center justify-center',
                ].join(' ')}
                title={t.name}
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden
                  style={{
                    background:
                      'radial-gradient(420px circle at 35% 25%, rgba(255,255,255,0.08), transparent 55%), radial-gradient(360px circle at 75% 75%, rgba(255,255,255,0.05), transparent 60%)',
                  }}
                />

                <div className="relative flex flex-col items-center justify-center gap-4 py-2">
                  <div className={`relative h-14 w-14 rounded-[22px] border ${ring} shadow-[0_0_0_1px_rgba(255,255,255,0.04)]`}>
                    <div className="absolute inset-0 rounded-[22px] opacity-0 animate-[pulse_2.8s_ease-in-out_infinite] bg-white/[0.04]" />
                    <div className="absolute inset-0 grid place-items-center">
                      <Icon className={`h-7 w-7 ${iconColor} animate-[float_3.6s_ease-in-out_infinite]`} />
                    </div>
                  </div>
                  <p className="text-[13px] font-medium tracking-[-0.01em] text-white/80 text-center leading-tight">
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
  );
}

function PricingPanel() {
  return (
    <div className="rounded-[28px] border border-[#2d2d2d] bg-[#101010] overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Weekly pricing</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-white">Quote preview</h3>
          <Link href="/register" className="text-[12px] text-white/45 hover:text-white/70 transition-colors">
            Get started →
          </Link>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-white/45 max-w-[60ch]">
          Pricing is defined by <span className="text-white/60">zone</span>, <span className="text-white/60">triggers</span>, and{' '}
          <span className="text-white/60">coverage limits</span>.
        </p>
      </div>

      <div className="group relative border-t border-[#2d2d2d] bg-black/20 px-6 py-8 sm:py-10 overflow-hidden min-h-[240px] sm:min-h-[320px] flex items-center justify-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden
          style={{
            background:
              'radial-gradient(760px circle at 15% 15%, rgba(125,211,252,0.10), transparent 55%), radial-gradient(760px circle at 85% 85%, rgba(167,139,250,0.09), transparent 60%)',
          }}
        />

        {/* Local grid guides for the canvas */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          aria-hidden
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage:
              'radial-gradient(70% 70% at 50% 55%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 78%)',
            WebkitMaskImage:
              'radial-gradient(70% 70% at 50% 55%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 78%)',
          }}
        />

        <div
          className="pointer-events-none absolute right-6 top-10 hidden sm:block text-[160px] font-semibold leading-none tracking-[-0.06em] text-white/[0.03]"
          aria-hidden
        >
          ₹
        </div>

        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {WORD_CLOUD.map((w) => (
            <div
              key={w.text}
              className={`absolute hidden sm:block ${w.x} ${w.y} ${w.rotate} select-none whitespace-nowrap text-[16px] font-semibold tracking-[-0.02em] text-white/10 bg-gradient-to-r ${w.gradient} bg-clip-text text-transparent`}
            >
              {w.text}
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="relative h-24 w-24 rounded-[32px] border border-[#2d2d2d] bg-[#161616] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_22px_70px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-0 rounded-[32px] opacity-0 animate-[pulse_2.8s_ease-in-out_infinite] bg-white/[0.05]" />
            <div className="absolute inset-0 grid place-items-center">
              <Calculator className="h-10 w-10 text-white/80 animate-[float_3.6s_ease-in-out_infinite]" />
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
      className={`rounded-[28px] border border-[#2d2d2d] bg-[#161616] p-6 sm:p-8 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Coverage boundary</p>
          <p className="mt-3 text-[20px] sm:text-[22px] font-semibold tracking-[-0.03em] text-white">
            Income protection only.
          </p>
          <p className="mt-2 max-w-[80ch] text-[13px] leading-relaxed text-white/45 sm:text-[14px]">
            Oasis is designed for loss of income from external disruptions. It does not cover health, life, accidents, or vehicle repairs.
          </p>
        </div>
        <Link
          href="#faq"
          className="group inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/55 hover:text-white/85 transition-colors"
        >
          <span className="underline underline-offset-[6px] decoration-white/15 group-hover:decoration-white/35 transition-colors">
            Read FAQ
          </span>
          <span className="text-white/30 group-hover:text-white/60 transition-all group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </div>
  );
}

export function MiddleSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-18">
      <div className="grid gap-6 lg:grid-cols-2 reveal-in-up" style={{ ['--d' as any]: '60ms' }}>
        <TriggersPanel />
        <div className="space-y-6">
          <PricingPanel />
          <CoverageBoundary />
        </div>
      </div>
    </section>
  );
}

