import { ButtonLink } from '@/components/ui/Button';
import { HeroDashboardPreviewLazy } from '@/components/landing/HeroDashboardPreviewLazy';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center pt-24 pb-16">
      {/* Massive Typographic Hero inside 90/10 brutalist layout */}
      <div className="relative mx-auto w-full max-w-7xl px-5 flex flex-col items-center text-center z-10">
        
        <h1
          className="mt-0 whitespace-normal text-[44px] font-bold leading-[0.95] tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 sm:text-[90px] md:text-[110px] reveal-in-up drop-shadow-sm filter"
          style={{ ['--d' as any]: '40ms' }}
        >
          Parametric <br className="hidden sm:block" />
          Wage Protection
        </h1>
        
        <p
          className="mt-8 max-w-[60ch] text-[15px] leading-relaxed text-white/50 sm:text-[18px] sm:leading-[1.6] reveal-in-up font-medium tracking-tight"
          style={{ ['--d' as any]: '120ms' }}
        >
          Oasis covers loss of income from external disruptions like extreme weather and locked zones. 
          Weekly pricing. <span className="text-white/80">Zero manual claims.</span>
        </p>

        <div className="mt-10 reveal-in-up flex flex-col sm:flex-row gap-4" style={{ ['--d' as any]: '180ms' }}>
          <ButtonLink 
            href="/register" 
            className="group relative overflow-hidden rounded-full bg-white text-black font-semibold px-8 h-12 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all duration-300"
          >
            <span className="relative z-10">Start Coverage</span>
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] animate-[shimmer_2.5s_infinite]" />
          </ButtonLink>
          <ButtonLink 
            href="https://oasisdocs.vercel.app" 
            variant="outline"
            className="rounded-full border border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] px-8 h-12 font-medium transition-colors"
          >
            Read Docs
          </ButtonLink>
        </div>
      </div>

      {/* Embedded Dashboard Preview */}
      <div className="mt-20 mx-auto w-full max-w-[1200px] reveal-in-up px-0 sm:px-5 relative z-10 perspective-[2000px]" style={{ ['--d' as any]: '500ms' }}>
        <div 
          className="relative rounded-t-2xl sm:rounded-2xl overflow-hidden border border-white/10 bg-[#0f0f0f] shadow-[0_0_100px_rgba(255,255,255,0.05)] transform-gpu rotate-x-[2deg] scale-[0.95] transition-all duration-1000 ease-out hover:rotate-x-0 hover:scale-100"
          style={{
             WebkitMaskImage: 'linear-gradient(to bottom, white 50%, transparent 100%)',
             maskImage: 'linear-gradient(to bottom, white 50%, transparent 100%)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none" />
          <HeroDashboardPreviewLazy variant="primary" />
        </div>      </div>
    </section>
  );
}

