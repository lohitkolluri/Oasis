const items = [
  { date: 'Mar 2026', title: 'Signals feed refresh', desc: 'Cleaner triggers catalog and calmer motion.' },
  { date: 'Mar 2026', title: 'Weekly quote preview', desc: 'Pricing defined by zone + triggers + limits.' },
  { date: 'Mar 2026', title: 'Audit-ready events', desc: 'Trigger events recorded for transparency.' },
];

export function ChangelogSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Now shipping
          </p>
          <h2 className="mt-3 text-[26px] sm:text-[30px] font-semibold tracking-[-0.04em] text-white">
            Changelog
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/45 max-w-[70ch]">
            Small, deliberate updates that keep the system predictable.
          </p>
        </div>

        <div className="border-t border-white/10 bg-black/20">
          {items.map((i, idx) => (
            <div
              key={`${i.date}-${i.title}`}
              className={[
                'px-6 py-5 sm:px-8',
                idx === 0 ? '' : 'border-t border-white/10',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    {i.date}
                  </p>
                  <p className="mt-2 text-[14px] font-semibold tracking-[-0.02em] text-white/85">
                    {i.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/45">
                    {i.desc}
                  </p>
                </div>
                <span className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/35">
                  →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

