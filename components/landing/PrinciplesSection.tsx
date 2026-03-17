const principles = [
  { t: 'No claims', d: 'When thresholds match, payouts are created automatically.' },
  { t: 'Weekly by design', d: 'Coverage and pricing align to weekly rider cashflows.' },
  { t: 'External disruptions only', d: 'Income loss from weather and zone-level restrictions · not health, life, accidents, or vehicle repairs.' },
];

export function PrinciplesSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="rounded-[28px] border border-[#2d2d2d] bg-[#161616] p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Principles
        </p>
        <h2 className="mt-3 text-[26px] sm:text-[30px] font-semibold tracking-[-0.04em] text-white">
          Opinionated and simple.
        </h2>
        <p className="mt-3 max-w-[75ch] text-[13px] leading-relaxed text-white/45 sm:text-[14px]">
          Keep it simple · weekly windows, clear limits, and automated payouts. Coverage is strictly for income loss from external disruptions.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {principles.map((p) => (
            <div key={p.t} className="rounded-[22px] border border-[#2d2d2d] bg-[#101010] p-5">
              <p className="text-[14px] font-semibold tracking-[-0.02em] text-white/85">
                {p.t}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/45">
                {p.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

