import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck, AlertTriangle, IndianRupee, Clock, Scale, Ban, HelpCircle } from "lucide-react";

function Section({ icon: Icon, number, title, children }: { icon: React.ElementType; number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-uber-green/10 shrink-0">
          <Icon className="h-4 w-4 text-uber-green" />
        </div>
        <h2 className="text-base font-semibold text-white">
          <span className="text-uber-green mr-1.5">§{number}</span> {title}
        </h2>
      </div>
      <div className="pl-11 space-y-3">{children}</div>
    </section>
  );
}

function Clause({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p className="text-zinc-400 text-sm leading-relaxed text-justify">
      <span className="text-zinc-500 font-mono text-xs mr-2">{id}</span>
      {children}
    </p>
  );
}

export default function PolicyDocsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-uber-green">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">Policy Wording</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Oasis Weekly Parametric Income Protection Policy
        </h1>
        <p className="text-zinc-500 text-sm leading-relaxed text-justify">
          Underwritten by Oasis Insurtech Private Limited (CIN: U66000KA2024PTC000000).
          This Policy Wording, together with the Policy Schedule, forms the contract of
          insurance between the Insured and the Company. Please read all sections carefully
          before subscribing.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
            Product Code: OASIS-WPIP-2024
          </span>
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
            UIN: OASIS-PARAM-WK-001
          </span>
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
            Version 2.1 — March 2025
          </span>
        </div>
      </div>

      {/* Policy Schedule Summary */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Policy Schedule</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Product Name</p>
            <p className="text-zinc-200 font-medium mt-0.5">Weekly Parametric Income Protection</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Coverage Period</p>
            <p className="text-zinc-200 font-medium mt-0.5">7 days (Monday 00:00 — Sunday 23:59 IST)</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Premium Frequency</p>
            <p className="text-zinc-200 font-medium mt-0.5">Weekly, payable in advance</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Sum Insured</p>
            <p className="text-zinc-200 font-medium mt-0.5">As per Plan (₹300 – ₹1,500 per event, up to 3 events/week)</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Trigger Mechanism</p>
            <p className="text-zinc-200 font-medium mt-0.5">Parametric (index-based, automated)</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Waiting Period</p>
            <p className="text-zinc-200 font-medium mt-0.5">Nil — coverage begins immediately upon payment</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-10">

        <Section icon={FileText} number="1" title="Preamble & Definitions">
          <Clause id="1.1">
            <strong className="text-zinc-300">{'"'}Insured{'"'} / {'"'}Policyholder{'"'}</strong> means the delivery partner
            registered on the Oasis platform who has paid the applicable weekly premium and whose details
            appear in the Policy Schedule.
          </Clause>
          <Clause id="1.2">
            <strong className="text-zinc-300">{'"'}Coverage Period{'"'}</strong> means the seven (7) consecutive calendar days
            commencing at 00:00 hours IST on Monday and ending at 23:59 hours IST on the immediately
            following Sunday, for which a valid premium has been received.
          </Clause>
          <Clause id="1.3">
            <strong className="text-zinc-300">{'"'}Parametric Trigger{'"'}</strong> means a pre-defined, objectively measurable
            index or threshold — derived from third-party data sources — the breach of which automatically
            determines eligibility for a Benefit Payment, without the need for individual loss assessment
            or claims adjudication.
          </Clause>
          <Clause id="1.4">
            <strong className="text-zinc-300">{'"'}Primary Zone{'"'}</strong> means the geographical delivery area declared by the
            Insured at the time of registration, defined by GPS coordinates and a service radius as
            recorded in the Insured{"'"}s profile.
          </Clause>
          <Clause id="1.5">
            <strong className="text-zinc-300">{'"'}External Disruption Event{'"'}</strong> means an occurrence outside the control
            of the Insured that materially impairs the ability to undertake deliveries in the Primary
            Zone, as further specified under Insured Perils (§3).
          </Clause>
          <Clause id="1.6">
            <strong className="text-zinc-300">{'"'}Benefit Payment{'"'}</strong> means the fixed monetary amount payable to the
            Insured upon the occurrence of a qualifying Parametric Trigger, as specified in the chosen
            Plan tier.
          </Clause>
          <Clause id="1.7">
            <strong className="text-zinc-300">{'"'}Verification Window{'"'}</strong> means the forty-eight (48) hour period
            following the creation of a claim during which the Insured must confirm their location via
            GPS to complete the Benefit Payment process.
          </Clause>
        </Section>

        <Section icon={ShieldCheck} number="2" title="Insuring Clause">
          <Clause id="2.1">
            Subject to the terms, conditions, and exclusions of this Policy, the Company agrees to pay
            the Insured the applicable Benefit Payment when a qualifying External Disruption Event occurs
            in or materially affecting the Insured{"'"}s Primary Zone during the Coverage Period, provided that:
          </Clause>
          <ul className="list-[lower-alpha] pl-5 space-y-1.5 text-zinc-400 text-sm leading-relaxed text-justify ml-8">
            <li>The applicable weekly premium has been paid in full and in advance;</li>
            <li>The relevant Parametric Trigger threshold has been breached, as verified by
              independent third-party data sources;</li>
            <li>The Insured{"'"}s Primary Zone falls within the geofence of the affected area;</li>
            <li>The weekly maximum Benefit Payments for the chosen Plan have not been exhausted; and</li>
            <li>No exclusion under §4 applies to the event in question.</li>
          </ul>
          <Clause id="2.2">
            This is a parametric insurance product. Benefit Payments are determined solely by the
            occurrence or non-occurrence of pre-defined trigger events as measured by specified data
            indices, and <strong className="text-zinc-300">not</strong> by the actual loss suffered by the Insured.
            The Insured acknowledges that Benefit Payments may be greater or lesser than any actual
            income loss experienced.
          </Clause>
        </Section>

        <Section icon={AlertTriangle} number="3" title="Insured Perils (Covered Events)">
          <Clause id="3.1">
            The following External Disruption Events constitute Insured Perils under this Policy, subject
            to the specified Parametric Trigger thresholds:
          </Clause>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-2">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Peril</th>
                  <th className="text-left py-2 pr-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Trigger Threshold</th>
                  <th className="text-left py-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Data Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <tr>
                  <td className="py-2.5 pr-3 text-zinc-300 font-medium">Extreme Heat</td>
                  <td className="py-2.5 pr-3 text-zinc-400">Temperature ≥ 43°C sustained for ≥ 3 consecutive hours</td>
                  <td className="py-2.5 text-zinc-500">Open-Meteo / Tomorrow.io</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 text-zinc-300 font-medium">Heavy Rainfall</td>
                  <td className="py-2.5 pr-3 text-zinc-400">Precipitation intensity ≥ 4 mm/hour</td>
                  <td className="py-2.5 text-zinc-500">Tomorrow.io</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 text-zinc-300 font-medium">Severe Air Quality</td>
                  <td className="py-2.5 pr-3 text-zinc-400">AQI exceeds zone-adaptive threshold (based on 30-day p75/p90 baseline)</td>
                  <td className="py-2.5 text-zinc-500">WAQI / Open-Meteo</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 text-zinc-300 font-medium">Traffic Gridlock</td>
                  <td className="py-2.5 pr-3 text-zinc-400">Traffic speed &lt; 50% of free-flow across majority of zone sample points</td>
                  <td className="py-2.5 text-zinc-500">TomTom Traffic / NewsData.io</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 text-zinc-300 font-medium">Civil Disruption</td>
                  <td className="py-2.5 pr-3 text-zinc-400">Curfew, strike, or lockdown affecting the Primary Zone, verified by LLM + geocoding</td>
                  <td className="py-2.5 text-zinc-500">NewsData.io / OpenRouter</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Clause id="3.2">
            The Company reserves the right to adjust Parametric Trigger thresholds based on
            evolving climatic, environmental, or regulatory conditions, with advance notice to
            the Insured at the time of weekly renewal.
          </Clause>
        </Section>

        <Section icon={Ban} number="4" title="Exclusions">
          <Clause id="4.1">
            This Policy does <strong className="text-zinc-300">not</strong> provide cover for, and no Benefit Payment
            shall be made in respect of:
          </Clause>
          <ul className="list-[lower-alpha] pl-5 space-y-1.5 text-zinc-400 text-sm leading-relaxed text-justify ml-8">
            <li>Bodily injury, illness, disease, disability, hospitalisation, or death of the Insured or any third party;</li>
            <li>Loss of life or accidental death benefits;</li>
            <li>Damage to, repair of, or replacement of any motor vehicle, bicycle, or equipment;</li>
            <li>Personal accident coverage of any nature;</li>
            <li>Income loss arising from the Insured{"'"}s voluntary decision not to work, app deactivation,
              account suspension, or platform-imposed restrictions;</li>
            <li>Disruptions occurring outside the declared Primary Zone;</li>
            <li>Events attributable to war, nuclear activity, terrorism (unless specifically endorsed), or sanctions;</li>
            <li>Fraudulent or deliberately fabricated claims, including GPS spoofing or location manipulation;</li>
            <li>Losses already indemnified under any other insurance policy or government compensation scheme.</li>
          </ul>
          <div className="bg-uber-yellow/5 border border-uber-yellow/20 rounded-lg px-4 py-3 mt-2">
            <p className="text-xs text-uber-yellow leading-relaxed text-justify">
              <strong>Important Notice:</strong> This product strictly covers loss of income due to
              external disruptions only. It is not a health, life, accident, or motor insurance product.
            </p>
          </div>
        </Section>

        <Section icon={IndianRupee} number="5" title="Premium, Plan Tiers & Benefit Schedule">
          <Clause id="5.1">
            The weekly premium is payable in Indian Rupees (INR) in advance of the Coverage Period
            via the payment methods made available on the Oasis platform (currently Stripe Checkout).
            No coverage is effective until the premium is received and confirmed.
          </Clause>
          <Clause id="5.2">
            The Insured shall select one of the following Plan tiers at the time of subscription:
          </Clause>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mt-2">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Plan</th>
                  <th className="text-right py-2 pr-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Premium/Week</th>
                  <th className="text-right py-2 pr-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Benefit/Event</th>
                  <th className="text-right py-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Max Events/Week</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <tr>
                  <td className="py-2.5 pr-3 text-zinc-300 font-medium">Basic</td>
                  <td className="py-2.5 pr-3 text-right text-zinc-400 tabular-nums">₹49</td>
                  <td className="py-2.5 pr-3 text-right text-zinc-400 tabular-nums">₹300</td>
                  <td className="py-2.5 text-right text-zinc-400 tabular-nums">1</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 text-zinc-300 font-medium">Standard</td>
                  <td className="py-2.5 pr-3 text-right text-zinc-400 tabular-nums">₹99</td>
                  <td className="py-2.5 pr-3 text-right text-zinc-400 tabular-nums">₹700</td>
                  <td className="py-2.5 text-right text-zinc-400 tabular-nums">2</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 text-zinc-300 font-medium">Premium</td>
                  <td className="py-2.5 pr-3 text-right text-zinc-400 tabular-nums">₹199</td>
                  <td className="py-2.5 pr-3 text-right text-zinc-400 tabular-nums">₹1,500</td>
                  <td className="py-2.5 text-right text-zinc-400 tabular-nums">3</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Clause id="5.3">
            Premiums are dynamically calculated based on the Insured{"'"}s Primary Zone risk profile,
            historical disruption frequency, weather forecast, seasonal risk patterns, and individual
            claims history. The Company shall display the recommended premium prior to renewal. The
            Insured may choose any Plan tier irrespective of the recommendation.
          </Clause>
          <Clause id="5.4">
            The maximum aggregate liability of the Company under this Policy during any single Coverage
            Period shall not exceed the maximum weekly Benefit limit for the selected Plan tier (i.e.,
            Benefit per Event × Max Events per Week).
          </Clause>
        </Section>

        <Section icon={Clock} number="6" title="Claims Procedure & Settlement">
          <Clause id="6.1">
            <strong className="text-zinc-300">Automatic Triggering.</strong> No claims submission is required.
            When a Parametric Trigger threshold is breached and verified by independent data sources,
            eligible Insured persons shall automatically receive a claim notification. The system operates
            continuously without manual adjudication.
          </Clause>
          <Clause id="6.2">
            <strong className="text-zinc-300">Location Verification.</strong> Upon receipt of a claim notification,
            the Insured shall confirm their presence within the affected zone by submitting GPS coordinates
            through the Oasis mobile application within the Verification Window of forty-eight (48) hours.
            GPS accuracy must be within 100 metres.
          </Clause>
          <Clause id="6.3">
            <strong className="text-zinc-300">Settlement.</strong> Upon successful location verification, the
            Benefit Payment shall be credited to the Insured{"'"}s Oasis wallet in real-time. Withdrawal
            terms are as specified on the platform.
          </Clause>
          <Clause id="6.4">
            <strong className="text-zinc-300">Failure to Verify.</strong> If the Insured fails to complete location
            verification within the Verification Window, the claim shall remain in {'"'}pending{'"'} status
            and may be reviewed by the Company at its discretion.
          </Clause>
          <Clause id="6.5">
            <strong className="text-zinc-300">Self-Report.</strong> The Insured may also submit a self-report through
            the platform with photographic evidence and GPS data. Self-reports are subject to rate limits
            (maximum three per day) and are corroborated against real-time weather and traffic data before
            approval.
          </Clause>
        </Section>

        <Section icon={Scale} number="7" title="Fraud Prevention & Anti-Abuse">
          <Clause id="7.1">
            The Company employs automated fraud detection systems including, but not limited to: duplicate
            claim detection, rapid claims throttling, weather data cross-verification, GPS accuracy validation,
            impossible travel detection, device fingerprinting, and cluster anomaly analysis.
          </Clause>
          <Clause id="7.2">
            Any claim flagged by the fraud detection system shall be withheld pending manual review. The
            Company reserves the right to deny Benefit Payments, cancel the Policy, and report suspected
            fraud to the appropriate authorities where reasonable grounds exist.
          </Clause>
          <Clause id="7.3">
            Deliberate misrepresentation of the Primary Zone, use of GPS spoofing applications, or submission
            of fabricated self-reports shall constitute material misrepresentation and shall render the Policy
            void <em>ab initio</em>.
          </Clause>
        </Section>

        <Section icon={Ban} number="8" title="Cancellation & Renewal">
          <Clause id="8.1">
            <strong className="text-zinc-300">Cancellation by Insured.</strong> The Insured may elect not to renew
            at the end of any Coverage Period. No refund of premium shall be payable for the current
            Coverage Period.
          </Clause>
          <Clause id="8.2">
            <strong className="text-zinc-300">Cancellation by Company.</strong> The Company may cancel this Policy
            by giving seven (7) days{"'"} written notice to the Insured (via the registered email or
            in-app notification). In such cases, a pro-rata refund of unearned premium shall be made.
          </Clause>
          <Clause id="8.3">
            <strong className="text-zinc-300">Renewal.</strong> This Policy does not auto-renew. The Insured must
            actively subscribe and pay the premium for each Coverage Period. The Company shall make
            premium recommendations available prior to the renewal date.
          </Clause>
        </Section>

        <Section icon={HelpCircle} number="9" title="General Conditions">
          <Clause id="9.1">
            <strong className="text-zinc-300">Duty of Disclosure.</strong> The Insured shall provide accurate information
            regarding their delivery platform, Primary Zone, and contact details. Any material misrepresentation
            may invalidate coverage under this Policy.
          </Clause>
          <Clause id="9.2">
            <strong className="text-zinc-300">Data Sources.</strong> The Company relies on third-party data providers
            (including Tomorrow.io, Open-Meteo, WAQI, TomTom, and NewsData.io) for Parametric Trigger
            verification. The Company shall not be liable for inaccuracies or outages in third-party
            data feeds, provided reasonable efforts are made to obtain reliable data.
          </Clause>
          <Clause id="9.3">
            <strong className="text-zinc-300">Dispute Resolution.</strong> Any dispute arising out of or in connection
            with this Policy shall first be raised through the Oasis support channel. If unresolved
            within thirty (30) days, the dispute shall be referred to arbitration in accordance with the
            Arbitration and Conciliation Act, 1996, with the seat of arbitration at Bengaluru, Karnataka.
          </Clause>
          <Clause id="9.4">
            <strong className="text-zinc-300">Governing Law.</strong> This Policy shall be governed by and construed in
            accordance with the laws of India. The courts of Bengaluru, Karnataka shall have exclusive
            jurisdiction.
          </Clause>
          <Clause id="9.5">
            <strong className="text-zinc-300">Amendments.</strong> The Company reserves the right to amend these terms
            upon reasonable notice to the Insured. Continued subscription after receiving notice of
            amendment constitutes acceptance of the revised terms.
          </Clause>
        </Section>
      </div>

      {/* Footer */}
      <div className="space-y-4 pt-6 border-t border-zinc-800">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 leading-relaxed text-justify">
            <strong className="text-zinc-400">Regulatory Disclaimer:</strong> This is a parametric
            insurance product designed for the Indian Q-commerce delivery segment. Product features,
            pricing, and trigger mechanisms are subject to regulatory approvals. For grievances,
            contact support@oasis.insure or call the toll-free helpline. This document constitutes
            the complete Policy Wording and supersedes all prior communications.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-uber-green hover:text-uber-green/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
