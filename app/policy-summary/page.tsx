import Link from 'next/link';
import { Footer } from '@/components/landing/Footer';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingShell } from '@/components/landing/LandingShell';
import { Ban, Landmark, CheckCircle2, XCircle, HelpCircle, Shield, Zap, Car, Cloud } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coverage boundaries & actuarial summary | Oasis',
  description:
    'Oasis weekly parametric income protection: zone-based triggers. Excludes health, life, accident, motor, war, pandemic-led restrictions, nuclear/terrorism (unless endorsed), and more — full wording in-app.',
};

export default function PolicySummaryPage() {
  return (
    <LandingShell>
      <LandingNav />
      <main className="mx-auto max-w-4xl px-5 pt-32 pb-24 relative z-10">

        {/* Glow Effects */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] pointer-events-none opacity-40 blur-[100px]" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-br from-uber-green/20 via-transparent to-uber-green/10" />
        </div>

        {/* Hero Section */}
        <div className="relative text-center max-w-2xl mx-auto mb-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-uber-green mb-4">
            Public Coverage Summary
          </p>
          <h1 className="text-[36px] sm:text-[48px] font-bold tracking-tight text-white leading-[1.1]">
            Clear boundaries. <br className="hidden sm:block" /> No hidden terms.
          </h1>
          <p className="mt-6 text-[16px] leading-relaxed text-zinc-400">
            Oasis provides deterministic payouts for parametric income loss. When objective disruptions strike your primary zone, you get paid.
            Review what affects your coverage below.
          </p>
        </div>

        {/* What's Covered / What's Not Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Covered */}
          <section className="bg-surface-1/50 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-uber-green/5 blur-3xl group-hover:bg-uber-green/10 transition-colors pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-uber-green/15 border border-uber-green/20">
                <CheckCircle2 className="h-5 w-5 text-uber-green" />
              </div>
              <h2 className="text-xl font-semibold text-white">What we cover</h2>
            </div>

            <p className="text-[14px] leading-relaxed text-zinc-400 mb-6">
              Loss of income when objective parametric triggers fire for your registered zone during an active weekly policy.
            </p>

            <ul className="space-y-4">
              {[
                { icon: Cloud, text: 'Extreme weather (Heavy rain, Heatwaves)' },
                { icon: Car, text: 'Severe gridlock (Abnormal traffic congestion)' },
                { icon: Zap, text: 'Social disruptions (Curfews, civil unrest)' },
                { icon: Shield, text: 'Real-time verified zone triggers' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <item.icon className="h-4 w-4 text-uber-green mt-0.5 shrink-0" />
                  <span className="text-[14px] leading-snug text-zinc-300 font-medium">{item.text}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Not Covered */}
          <section className="bg-surface-1/50 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-3xl group-hover:bg-red-500/10 transition-colors pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-white">What we explicitly exclude</h2>
            </div>

            <p className="text-[14px] leading-relaxed text-zinc-400 mb-6">
              Oasis is pure parametric income protection. It is <strong className="text-zinc-200">not</strong> health, life, accident, or motor cover.
            </p>

            <ul className="space-y-4">
              {[
                'Health, medical bills, or hospitalization',
                'Loss of life or personal accident compensation',
                'Vehicle repair, damage, or theft',
                'Epidemic, pandemic, or disease-led restrictions — unless a separate weather, traffic, or news-verified trigger still fires for your zone',
                'War, invasion, civil war, rebellion, military or usurped power',
                'Nuclear radiation or contamination, and terrorism or sabotage (unless the policy is specifically endorsed for terrorism)',
                'Cyber outages or grid failures, unless an insured peril in the full wording is still satisfied by published third-party data',
                'App suspensions, voluntary time off, or events outside your registered primary zone',
                'Double recovery if another policy or government scheme already paid you for the same loss',
                'GPS spoofed or fraudulent locations',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Ban className="h-4 w-4 text-red-500/80 mt-0.5 shrink-0" />
                  <span className="text-[14px] leading-snug text-zinc-300 font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Extended FAQs using simple details/summary for zero-JS functionality & SEO */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10">
              <HelpCircle className="h-5 w-5 text-zinc-300" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Frequently asked questions</h2>
          </div>

          <div className="grid gap-3">
            {[
              {
                q: "How fast do I get paid?",
                a: "Instantly. Once a parametric trigger fires in your zone, you have 48 hours to confirm your physical presence in the app (the Verification Window). The moment your GPS is verified, the payout is credited to your wallet."
              },
              {
                q: "What defines a 'traffic gridlock'?",
                a: "We use third-party APIs (like TomTom) to monitor traffic speeds across your zone. If the average speed drops to less than 50% of the normal free-flow speed for a sustained period, the trigger automatically fires."
              },
              {
                q: "Can I claim if my vehicle breaks down?",
                a: "No. Oasis only covers external disruptions affecting your entire zone (like weather or curfews). We do not cover individual circumstances like vehicle breakdowns, accidents, or illness."
              },
              {
                q: "Do I need to submit receipts or photos?",
                a: "Usually, no. Because the system is parametric, payouts are triggered by third-party data. You only need to verify your GPS location. In rare cases (like localized flooding), you can submit a self-report with a photo, which is corroborated by our AI."
              },
              {
                q: "Does a pandemic lockdown count as a covered disruption?",
                a: "Generally no: income loss that is mainly due to disease-related restrictions, quarantine, or public-health emergencies is excluded. If an independent trigger in your zone still fires — for example severe weather or verified curfew signals that meet the parametric thresholds — coverage follows the full policy wording, not the reason headlines give for staying home."
              },
              {
                q: "Are war or terrorism events covered?",
                a: "No. Standard exclusions apply for war, invasion, military power, nuclear radiation, and terrorism unless the insurer later offers a specific endorsement. Oasis is designed for weather, traffic, and civil-disruption indices, not conflict or terror perils."
              }
            ].map((faq, i) => (
              <details key={i} className="group bg-surface-1/40 hover:bg-surface-1 rounded-2xl border border-white/10 transition-colors [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer list-none p-5 sm:p-6 font-semibold text-zinc-200">
                  <span>{faq.q}</span>
                  <span className="ml-4 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 group-open:bg-uber-green/20 group-open:text-uber-green transition-colors shrink-0">
                    <span className="transition-transform duration-300 group-open:rotate-180">↓</span>
                  </span>
                </summary>
                <div className="px-5 pb-6 sm:px-6 pt-0 text-[15px] leading-relaxed text-zinc-400">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Premium Actuarial Callout Card */}
        <section className="bg-gradient-to-br from-zinc-900 to-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Landmark className="w-48 h-48" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 text-white">
              <Landmark className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold tracking-tight">Actuarial Reserves & Reinsurance Overview</h2>
            </div>
            <p className="max-w-3xl text-[15px] leading-relaxed text-zinc-400 mb-4">
              Oasis operates on a strictly deterministic pricing model. Weekly premiums include a core <strong className="text-zinc-200 font-medium">technical reserve load</strong> in the pricing engine designed to account for tail volatility and verification lag.
            </p>
            <p className="max-w-3xl text-[15px] leading-relaxed text-zinc-400">
              Weekly plan caps inherently limit the maximum exposure density per rider. At portfolio scale, Oasis mitigates systemic correlation using <strong className="text-zinc-200 font-medium">quota-share reinsurance</strong> and <strong className="text-zinc-200 font-medium">catastrophe excess-of-loss</strong> treaties for overlapping weather or civil-disruption events. Full legal wording is available in section §10 of the internal policy document.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-16 flex flex-col sm:flex-row gap-4 sm:items-center justify-center">
          <Link
            href="/register"
            className="inline-flex justify-center rounded-full bg-white text-black font-semibold px-8 py-3.5 text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Get covered today
          </Link>
          <Link href="/login" className="text-[14px] font-medium text-zinc-400 hover:text-white transition-colors px-4 py-2">
            Sign in to view full Policy Documents →
          </Link>
        </div>
      </main>
      <Footer />
    </LandingShell>
  );
}
