import Link from 'next/link';
import { Footer } from '@/components/landing/Footer';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingShell } from '@/components/landing/LandingShell';
import { Ban, Landmark } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coverage boundaries & actuarial summary | Oasis',
  description:
    'Oasis weekly parametric income protection: external disruption triggers in your zone. Excludes health, life, accident, and vehicle repair; full policy wording in-app.',
};

export default function PolicySummaryPage() {
  return (
    <LandingShell>
      <LandingNav />
      <main className="mx-auto max-w-2xl px-5 pt-28 pb-16 sm:pb-24 relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3">Public summary</p>
        <h1 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] text-white leading-tight">
          Coverage boundaries
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/50">
          Oasis covers <strong className="text-white/80 font-medium">loss of income</strong> when objective
          parametric triggers fire for your registered zone during an active weekly policy. Anything that reduces
          deliveries because of <strong className="text-white/80 font-medium">external</strong> disruption can be in
          scope when the trigger rules are met. This product <em>does not</em> extend to certain lines of business
          (below). It is <strong className="text-white/80 font-medium">not</strong> health, life, accident,
          or motor cover.
        </p>

        <section className="mt-12 space-y-6">
          <div className="flex items-center gap-2 text-white/90">
            <Ban className="h-5 w-5 text-white/50 shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">What Oasis explicitly excludes</h2>
          </div>
          <ul className="space-y-3 text-[15px] leading-relaxed text-white/55 list-disc pl-5">
            <li>
              <strong className="text-white/75 font-medium">Health, life, personal accident,</strong> and{' '}
              <strong className="text-white/75 font-medium">vehicle repair</strong> are not covered. Payouts are for
              parametric income loss only, not medical bills, death benefits, injury compensation, or fixing a vehicle.
            </li>
          </ul>
          <p className="text-[15px] leading-relaxed text-white/45 pt-2">
            Fraud prevention, double recovery, registered Primary Zone, sanctions, and other standard contract terms
            (including additional exclusions) are defined in the full <strong className="text-white/60 font-medium">Policy
            Documents</strong> after sign-in. Those details are not summarized here as marketing exclusions.
          </p>
        </section>

        <section className="mt-12 space-y-6 pt-10 border-t border-white/10">
          <div className="flex items-center gap-2 text-white/90">
            <Landmark className="h-5 w-5 text-white/50 shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">Reserves & reinsurance (overview)</h2>
          </div>
          <p className="text-[15px] leading-relaxed text-white/55">
            Premiums include a small <strong className="text-white/75 font-medium">technical reserve load</strong> in
            the pricing engine for tail volatility and verification lag. Weekly plan caps limit maximum exposure per
            rider. At scale, the portfolio would be supported by <strong className="text-white/75 font-medium">quota-share
            reinsurance</strong> and <strong className="text-white/75 font-medium">catastrophe excess-of-loss</strong>{' '}
            for correlated weather and civil-disruption events. See full wording in-app §10.
          </p>
        </section>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 sm:items-center">
          <Link
            href="/register"
            className="inline-flex justify-center rounded-full bg-white text-black font-semibold px-6 py-3 text-[15px] hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
          <Link href="/login" className="text-[15px] text-white/50 hover:text-white/80 transition-colors">
            Sign in for full Policy Documents →
          </Link>
        </div>
      </main>
      <Footer />
    </LandingShell>
  );
}
