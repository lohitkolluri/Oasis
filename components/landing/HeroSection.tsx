import { ButtonLink } from '@/components/ui/Button';
import { HeroDashboardPreviewLazy } from '@/components/landing/HeroDashboardPreviewLazy';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-10 sm:pt-24 sm:pb-16">
        {/* Left-aligned hero copy */}
        <div className="max-w-4xl">
          <h1
            className="mt-0 whitespace-normal sm:whitespace-nowrap text-[38px] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[64px] reveal-in-up"
            style={{ ['--d' as any]: '40ms' }}
          >
            Parametric payouts for gig workers.
          </h1>
          <p
            className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-white/45 sm:text-[14px] reveal-in-up"
            style={{ ['--d' as any]: '120ms' }}
          >
            <span className="sm:hidden">
              Weekly income protection for disruptions like weather and zone restrictions. Automated payouts.
            </span>
            <span className="hidden sm:inline">
              Oasis covers loss of income from external disruptions (extreme weather, zone lockdowns). No health, life,
              accident, or vehicle-repair coverage. Weekly pricing. Zero manual claims.
            </span>
          </p>

        <div className="mt-5" />
        </div>

        {/* Wide hero product shot */}
        <div className="mt-10 max-w-[1100px] reveal-in-up" style={{ ['--d' as any]: '200ms' }}>
          <HeroDashboardPreviewLazy variant="primary" />
        </div>
      </div>
    </section>
  );
}

