const metrics = [
  { k: 'Zones monitored', v: '128' },
  { k: 'Triggers supported', v: '12' },
  { k: 'Median payout time', v: '< 5m' },
  { k: 'Weekly windows', v: 'Every week' },
];

export function MetricsRowSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="rounded-[28px] border border-[#2d2d2d] bg-[#161616] px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Metrics <span className="text-white/20">(demo)</span>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-white/45 max-w-[60ch]">
              A quick sense of scale — values shown are illustrative.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.k} className="rounded-2xl border border-[#2d2d2d] bg-[#101010] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                {m.k}
              </p>
              <p className="mt-2 text-[26px] font-semibold tracking-[-0.05em] text-white/85 tabular-nums">
                {m.v}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

