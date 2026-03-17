import { ButtonLink } from '@/components/ui/Button';

export function FinalCTASection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <div className="relative overflow-hidden rounded-[28px] border border-[#2d2d2d] bg-[#161616] p-7 sm:p-10 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_28px_90px_rgba(0,0,0,0.6)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            background:
              'radial-gradient(720px circle at 20% 0%, rgba(255,255,255,0.10), transparent 55%), radial-gradient(720px circle at 80% 100%, rgba(255,255,255,0.06), transparent 60%)',
          }}
        />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Ready to run it weekly?
          </p>
          <h2 className="mt-3 text-[28px] sm:text-[36px] font-semibold tracking-[-0.05em] text-white">
            Parametric payouts · without manual claims.
          </h2>
          <p className="mt-2 max-w-[75ch] text-[13px] leading-relaxed text-white/45 sm:text-[14px]">
            Configure triggers by zone, price weekly, and let external signals handle payouts automatically.
          </p>

          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <ButtonLink
              href="/register"
              variant="landingPrimary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Get started
            </ButtonLink>
            <ButtonLink
              href="/login"
              variant="landingSecondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Open app
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

