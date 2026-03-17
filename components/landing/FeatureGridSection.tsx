import { CloudRain, ShieldCheck, Sparkles } from 'lucide-react';

function Figure({
  label,
  title,
  desc,
  children,
}: {
  label: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-6 pt-5 pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
          {label}
        </p>
        <div className="mt-4 h-[150px] rounded-2xl border border-white/10 bg-black/20 grid place-items-center">
          {children}
        </div>
        <p className="mt-5 text-[14px] font-semibold tracking-[-0.02em] text-white/85">
          {title}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-white/45">
          {desc}
        </p>
      </div>
    </div>
  );
}

export function FeatureGridSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="max-w-[62rem]">
        <p className="text-[clamp(28px,3.1vw,40px)] font-semibold tracking-[-0.045em] text-white/90 leading-[1.08]">
          A new species of insurance tool. Built for weekly income protection with parametric automation at its core.
        </p>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        <Figure
          label="FIG 0.2"
          title="Built for automation"
          desc="Trigger signals decide eligibility. Payouts are created automatically."
        >
          <div className="relative h-[110px] w-[160px]">
            <div className="absolute inset-0 rounded-2xl border border-white/10" />
            <div className="absolute left-4 top-4 h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.02] grid place-items-center">
              <Sparkles className="h-6 w-6 text-white/50" />
            </div>
            <div className="absolute right-4 top-6 h-3 w-20 rounded-full bg-white/[0.06]" />
            <div className="absolute right-4 top-12 h-3 w-14 rounded-full bg-white/[0.04]" />
            <div className="absolute left-4 bottom-5 h-2 w-24 rounded-full bg-white/[0.04]" />
            <div className="absolute left-4 bottom-9 h-2 w-16 rounded-full bg-white/[0.06]" />
          </div>
        </Figure>

        <Figure
          label="FIG 0.3"
          title="Powered by signals"
          desc="External weather and disruption indicators drive trigger events."
        >
          <svg width="180" height="120" viewBox="0 0 180 120" className="text-white/20">
            <path
              d="M20 82 C40 60, 60 60, 76 74 C82 52, 100 44, 116 56 C126 40, 148 44, 154 62 C166 62, 170 72, 166 80 C160 92, 142 94, 120 92 H52 C34 92, 24 90, 20 82 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M56 98 L50 110 M84 98 L78 110 M112 98 L106 110"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="132" cy="42" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M132 30 V18 M132 66 V54 M120 42 H108 M156 42 H144"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </Figure>

        <Figure
          label="FIG 0.4"
          title="Designed for clarity"
          desc="Simple weekly windows. Clear limits. Predictable outcomes."
        >
          <div className="relative h-[110px] w-[170px]">
            <div className="absolute inset-0 rounded-2xl border border-white/10" />
            <div className="absolute left-5 top-5 h-16 w-[120px] rounded-2xl border border-white/10 bg-white/[0.02]" />
            <div className="absolute left-8 top-10 h-2 w-24 rounded-full bg-white/[0.06]" />
            <div className="absolute left-8 top-15 h-2 w-16 rounded-full bg-white/[0.04]" />
            <div className="absolute right-5 bottom-5 h-10 w-10 rounded-2xl border border-white/10 bg-black/20 grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-white/45" />
            </div>
          </div>
        </Figure>
      </div>
    </section>
  );
}

