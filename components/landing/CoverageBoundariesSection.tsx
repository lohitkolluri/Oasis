import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Ban, CloudSun, ShieldCheck, Waypoints, HeartPulse } from 'lucide-react';

const covered = [
  {
    title: 'Weather & environment',
    description:
      'Heat, rain, floods, severe pollution, and other conditions that stop outdoor work or halt deliveries once objective thresholds in your zone are met.',
    icon: CloudSun,
  },
  {
    title: 'Restrictions & closures',
    description:
      'Curfews, strikes, and sudden zone or market closures that block pickup and drop, verified against external signals.',
    icon: Waypoints,
  },
  {
    title: 'Parametric payouts',
    description:
      'Loss-of-income triggers only: when the week is active and rules fire, payouts run automatically with no manual claims.',
    icon: ShieldCheck,
  },
];

export function CoverageBoundariesSection() {
  return (
    <section
      id="coverage-boundaries"
      className="mx-auto max-w-5xl px-5 py-20 sm:py-32 relative z-10"
    >
      <div
        className="flex flex-col items-center text-center reveal-in-up mb-16"
        style={{ '--d': '60ms' } as CSSProperties}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] mb-6 shadow-lg">
          <ShieldCheck className="h-6 w-6 text-white/50" aria-hidden />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3">Product scope</p>
        <h2 className="text-[32px] sm:text-[42px] font-bold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 leading-tight">
          What Oasis covers
        </h2>
        <p className="mt-6 text-[16px] leading-relaxed text-white/50 max-w-2xl font-medium tracking-tight">
          Weekly parametric income protection when external disruptions reduce work in your registered zone. Oasis insures{' '}
          <span className="text-white/70">lost wages from uncontrollable events</span>, not the cost of fixing bikes or
          medical bills. Read the{' '}
          <Link
            href="/policy-summary"
            className="text-white/80 underline underline-offset-4 hover:text-white transition-colors"
          >
            public summary
          </Link>{' '}
          or full Policy Documents after sign-in for fraud, zone rules, and complete wording.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr mb-10">
        {covered.map((item, idx) => (
          <div
            key={item.title}
            className="reveal-in-up group relative overflow-hidden flex flex-col p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#070707] transition-all hover:border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
            style={{ '--d': `${(idx + 1) * 100}ms` } as CSSProperties}
          >
            <div className="mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110">
                <item.icon className="h-4 w-4 text-white/70" />
              </div>
            </div>
            <h3 className="text-[18px] font-bold text-white tracking-tight mb-2">{item.title}</h3>
            <p className="text-[14px] leading-relaxed text-white/50">{item.description}</p>
          </div>
        ))}
      </div>

      <div
        className="reveal-in-up rounded-3xl border border-amber-500/20 bg-amber-500/[0.06] p-6 sm:p-8"
        style={{ '--d': '420ms' } as CSSProperties}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Ban className="h-4 w-4 text-amber-200/80" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className="h-4 w-4 text-white/40 shrink-0" aria-hidden />
              <h3 className="text-[16px] font-bold text-white tracking-tight">
                Lines of business we do not offer
              </h3>
            </div>
            <p className="text-[14px] leading-relaxed text-white/55">
              <strong className="text-white/75 font-medium">Health, life, personal accident, and vehicle repair</strong>{' '}
              are not covered. Oasis pays for <strong className="text-white/75 font-medium">income loss</strong> tied to
              parametric triggers, not hospital bills, life benefits, crash compensation, or garage costs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
