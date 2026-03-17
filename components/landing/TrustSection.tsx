import { Badge } from '@/components/ui/badge';

export function TrustSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              Built for automation
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Real signals. Clear rules. Audit-friendly.
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-white/[0.06] text-white/70">
              Weekly pricing
            </Badge>
            <Badge variant="secondary" className="bg-white/[0.06] text-white/70">
              Zero manual claims
            </Badge>
            <Badge variant="secondary" className="bg-white/[0.06] text-white/70">
              Parametric
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { k: 'Triggers', v: 'Weather + disruption indicators (API-driven)' },
            { k: 'Decisioning', v: 'Rule-based eligibility with thresholds' },
            { k: 'Payouts', v: 'Automated creation + settlement events' },
          ].map((item) => (
            <div key={item.k} className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-xs font-semibold text-white/85">{item.k}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/60">{item.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

