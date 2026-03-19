import { ButtonLink } from '@/components/ui/Button';

export function FinalCTASection() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-20 sm:py-32 relative z-10">
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#070707] p-8 sm:p-24 shadow-[0_0_80px_rgba(255,255,255,0.02)] reveal-in-up" style={{ ['--d' as any]: '60ms' }}>
        
        {/* Glow Effects */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
          aria-hidden
          style={{
            background: 'radial-gradient(800px circle at 50% 50%, rgba(255,255,255,0.04), transparent 60%)',
          }}
        />

        <div className="relative z-10 text-center flex flex-col items-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/40 mb-6">
            Ready to run it weekly?
          </p>
          <h2 className="text-[36px] sm:text-[52px] font-bold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 leading-tight">
            Parametric payouts.
          </h2>
          <p className="mt-4 max-w-[600px] text-[18px] leading-relaxed text-white/50 tracking-tight">
            Configure triggers by zone, price weekly, and let external signals handle payouts automatically.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row justify-center w-full sm:w-auto">
            <ButtonLink
              href="/register"
              className="relative overflow-hidden w-full sm:w-auto rounded-full bg-white text-black font-semibold px-8 h-12 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all duration-300"
            >
              <span className="relative z-10">Get started</span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] animate-[shimmer_2.5s_infinite]" />
            </ButtonLink>
            <ButtonLink
              href="/login"
              variant="outline"
              className="w-full sm:w-auto rounded-full border border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] hover:border-white/20 px-8 h-12 font-medium transition-colors"
            >
              Open app
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
