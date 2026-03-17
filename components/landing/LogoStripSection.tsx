export function LogoStripSection() {
  const logos = ['Zepto', 'Blinkit', 'Instamart', 'Dunzo', 'Rapido', 'Porter'];

  return (
    <section className="mx-auto max-w-6xl px-5 pt-8 pb-10 sm:pt-10 sm:pb-14">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.02] px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center justify-between gap-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Built for India’s Q‑commerce ecosystem <span className="text-white/20">(demo)</span>
          </p>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium text-white/30">
            <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
            <span>partners</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {logos.map((l) => (
            <div
              key={l}
              className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-center"
            >
              <span className="text-[12px] font-semibold tracking-[-0.02em] text-white/40">
                {l}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

