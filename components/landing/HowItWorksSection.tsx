import { CloudRain, ShieldCheck, Zap } from 'lucide-react';

const steps = [
  {
    title: 'Detect disruption',
    body: 'We monitor real signals (weather + zone conditions) for your city and working area.',
    icon: CloudRain,
  },
  {
    title: 'Verify automatically',
    body: 'Parametric rules decide eligibility with transparent thresholds — no forms or calls.',
    icon: ShieldCheck,
  },
  {
    title: 'Pay out fast',
    body: 'When conditions match, payouts are created and settled with zero manual claims processing.',
    icon: Zap,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-14 sm:py-18">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            How it works
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Parametric coverage, built for speed.
          </h2>
        </div>
        <p className="hidden max-w-md text-sm leading-relaxed text-white/60 md:block">
          Oasis is purpose-built for income disruption — not health, life, accidents, or vehicle repairs.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.title}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 shadow-[0_0_20px_rgba(255,255,255,0.02)]"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                <s.icon className="h-4 w-4 text-white/70" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-white/90">{s.title}</p>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/60">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

