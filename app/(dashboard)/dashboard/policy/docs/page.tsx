import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck, AlertTriangle, IndianRupee, Clock, Scale, Ban, HelpCircle, Landmark, Cloud, Car, Megaphone } from "lucide-react";

function Section({ id, icon: Icon, number, title, children }: { id: string, icon: React.ElementType; number: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-5 scroll-mt-24">
      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-uber-green/10 shrink-0">
          <Icon className="h-4 w-4 text-uber-green" />
        </div>
        <h2 className="text-lg font-semibold text-white tracking-tight">
          <span className="text-uber-green/80 mr-2">§{number}</span> {title}
        </h2>
      </div>
      <div className="pl-0 sm:pl-12 space-y-4">{children}</div>
    </section>
  );
}

function Clause({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-zinc-500 font-mono text-xs font-semibold mt-0.5 shrink-0 bg-white/5 px-1.5 py-0.5 rounded">{id}</span>
      <p className="text-zinc-400 text-[15px] leading-relaxed">
        {children}
      </p>
    </div>
  );
}

const TOC_ITEMS = [
  { id: "preamble", number: "1", title: "Preamble & Definitions" },
  { id: "insuring", number: "2", title: "Insuring Clause" },
  { id: "perils", number: "3", title: "Insured Perils" },
  { id: "exclusions", number: "4", title: "Exclusions" },
  { id: "premium", number: "5", title: "Premium & Tiers" },
  { id: "claims", number: "6", title: "Claims Settlement" },
  { id: "fraud", number: "7", title: "Fraud Prevention" },
  { id: "cancellation", number: "8", title: "Cancellation & Renew" },
  { id: "general", number: "9", title: "General Conditions" },
  { id: "reserves", number: "10", title: "Actuarial Framework" },
];

export default function PolicyDocsPage() {
  return (
    <div className="max-w-[1100px] mx-auto xl:grid xl:grid-cols-[1fr_280px] xl:gap-12 items-start">
      
      {/* Main Content */}
      <div className="space-y-12">
        <Link
          href="/dashboard/policy"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to policy
        </Link>

        {/* Header */}
        <div className="space-y-5 pb-8 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-uber-green/15 border border-uber-green/30">
              <ShieldCheck className="h-4 w-4 text-uber-green" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-uber-green">Policy Wording</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-[1.15]">
            Oasis Weekly Parametric <br className="hidden sm:block" /> Income Protection Policy
          </h1>
          <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl">
            Underwritten by Oasis Insurtech Private Limited (CIN: U66000KA2024PTC000000).
            This Policy Wording, together with the Policy Schedule, forms the contract of
            insurance between the Insured and the Company. Please read all sections carefully
            before subscribing.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-[#0c0c0c] text-zinc-400 border border-white/10 shadow-sm">
              Product Code: OASIS-WPIP-2024
            </span>
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-[#0c0c0c] text-zinc-400 border border-white/10 shadow-sm">
              UIN: OASIS-PARAM-WK-001
            </span>
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-[#0c0c0c] text-zinc-400 border border-white/10 shadow-sm">
              Version 2.2, March 2026
            </span>
          </div>
        </div>

        {/* Dashboard-Style Policy Schedule Summary widget */}
        <div className="bg-gradient-to-br from-[#0f0f10] to-[#0a0a0b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-uber-green/5 blur-[80px] group-hover:bg-uber-green/10 transition-colors pointer-events-none" aria-hidden />
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <FileText className="h-4 w-4 text-zinc-400" />
            <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Policy Schedule Summary</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.03]">
            {[
              { label: "Product Name", value: "Weekly Parametric Income Protection" },
              { label: "Coverage Period", value: "7 days (Monday 00:00 to Sunday 23:59 IST)" },
              { label: "Premium Frequency", value: "Weekly, payable in advance" },
              { label: "Sum Insured", value: "As per Plan (₹300 – ₹1,500 per event)" },
              { label: "Trigger Mechanism", value: "Parametric (index-based, automated)" },
              { label: "Waiting Period", value: "Nil. Coverage begins immediately" },
            ].map((item, i) => (
              <div key={i} className="bg-[#0f0f10] p-5 relative z-10 transition-colors hover:bg-[#121213]">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{item.label}</p>
                <p className="text-[13px] text-zinc-200 mt-1.5 font-medium leading-snug">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-16">

          <Section id="preamble" icon={FileText} number="1" title="Preamble & Definitions">
            <Clause id="1.1">
              <strong className="text-white font-medium">{'"'}Insured{'"'} / {'"'}Policyholder{'"'}</strong> means the delivery partner
              registered on the Oasis platform who has paid the applicable weekly premium and whose details
              appear in the Policy Schedule.
            </Clause>
            <Clause id="1.2">
              <strong className="text-white font-medium">{'"'}Coverage Period{'"'}</strong> means the seven (7) consecutive calendar days
              commencing at 00:00 hours IST on Monday and ending at 23:59 hours IST on the immediately
              following Sunday, for which a valid premium has been received.
            </Clause>
            <Clause id="1.3">
              <strong className="text-white font-medium">{'"'}Parametric Trigger{'"'}</strong> means a pre-defined, objectively measurable
              index or threshold (derived from third-party data sources), the breach of which automatically
              determines eligibility for a Benefit Payment, without the need for individual loss assessment
              or claims adjudication.
            </Clause>
            <Clause id="1.4">
              <strong className="text-white font-medium">{'"'}Primary Zone{'"'}</strong> means the geographical delivery area declared by the
              Insured at the time of registration, defined by GPS coordinates and a service radius as
              recorded in the Insured{"'"}s profile.
            </Clause>
            <Clause id="1.5">
              <strong className="text-white font-medium">{'"'}External Disruption Event{'"'}</strong> means an occurrence outside the control
              of the Insured that materially impairs the ability to undertake deliveries in the Primary
              Zone, as further specified under Insured Perils (§3).
            </Clause>
            <Clause id="1.6">
              <strong className="text-white font-medium">{'"'}Benefit Payment{'"'}</strong> means the fixed monetary amount payable to the
              Insured upon the occurrence of a qualifying Parametric Trigger, as specified in the chosen
              Plan tier.
            </Clause>
            <Clause id="1.7">
              <strong className="text-white font-medium">{'"'}Verification Window{'"'}</strong> means the forty-eight (48) hour period
              following the creation of a claim during which the Insured must confirm their location via
              GPS to complete the Benefit Payment process.
            </Clause>
          </Section>

          <Section id="insuring" icon={ShieldCheck} number="2" title="Insuring Clause">
            <Clause id="2.1">
              Subject to the terms, conditions, and exclusions of this Policy, the Company agrees to pay
              the Insured the applicable Benefit Payment when a qualifying External Disruption Event occurs
              in or materially affecting the Insured{"'"}s Primary Zone during the Coverage Period, provided that:
            </Clause>
            <ul className="list-[lower-alpha] pl-[52px] space-y-2.5 text-zinc-400 text-[14px] leading-relaxed">
              <li>The applicable weekly premium has been paid in full and in advance;</li>
              <li>The relevant Parametric Trigger threshold has been breached, as verified by independent third-party data sources;</li>
              <li>The Insured{"'"}s Primary Zone falls within the geofence of the affected area;</li>
              <li>The weekly maximum Benefit Payments for the chosen Plan have not been exhausted; and</li>
              <li>No exclusion under §4 applies to the event in question.</li>
            </ul>
            <Clause id="2.2">
              This is a parametric insurance product. Benefit Payments are determined solely by the
              occurrence or non-occurrence of pre-defined trigger events as measured by specified data
              indices, and <strong className="text-white">not</strong> by the actual loss suffered by the Insured.
              The Insured acknowledges that Benefit Payments may be greater or lesser than any actual
              income loss experienced.
            </Clause>
          </Section>

          <Section id="perils" icon={AlertTriangle} number="3" title="Insured Perils (Covered Events)">
            <Clause id="3.1">
              The following External Disruption Events constitute Insured Perils under this Policy, subject
              to the specified Parametric Trigger thresholds:
            </Clause>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-lg mt-4 ml-10">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-black/40">
                      <th className="text-left py-3 px-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest w-48">Peril</th>
                      <th className="text-left py-3 px-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Trigger Threshold</th>
                      <th className="text-left py-3 px-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Data Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {[
                      { icon: Cloud, type: 'Extreme Heat', iconBg: 'bg-amber-500/15 text-amber-500', thr: 'Temperature ≥ 43°C sustained for ≥ 3 consecutive hours', src: 'Open-Meteo / Tomorrow.io' },
                      { icon: Cloud, type: 'Heavy Rainfall', iconBg: 'bg-sky-500/15 text-sky-400', thr: 'Precipitation intensity ≥ 4 mm/hour', src: 'Tomorrow.io' },
                      { icon: Cloud, type: 'Severe Air Quality', iconBg: 'bg-zinc-500/15 text-zinc-400', thr: 'AQI exceeds zone-adaptive threshold (based on 30-day p75/p90 baseline)', src: 'WAQI / Open-Meteo' },
                      { icon: Car, type: 'Traffic Gridlock', iconBg: 'bg-red-500/15 text-red-500', thr: 'Traffic speed < 50% of free-flow across majority of zone sample points', src: 'TomTom Traffic / NewsData.io' },
                      { icon: Megaphone, type: 'Civil Disruption', iconBg: 'bg-violet-500/15 text-violet-400', thr: 'Curfew, strike, or lockdown affecting the Primary Zone, verified by LLM + geocoding', src: 'NewsData.io / OpenRouter' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-medium text-zinc-200">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${row.iconBg}`}>
                              <row.icon className="w-3.5 h-3.5" />
                            </div>
                            {row.type}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 text-[13px] leading-relaxed">{row.thr}</td>
                        <td className="py-3.5 px-4 text-zinc-500 text-[12px]">{row.src}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Clause id="3.2">
              The Company reserves the right to adjust Parametric Trigger thresholds based on
              evolving climatic, environmental, or regulatory conditions, with advance notice to
              the Insured at the time of weekly renewal.
            </Clause>
          </Section>

          <Section id="exclusions" icon={Ban} number="4" title="Exclusions">
            <Clause id="4.1">
              This Policy does <strong className="text-white">not</strong> provide cover for, and no Benefit Payment
              shall be made in respect of:
            </Clause>
            <ul className="list-[lower-alpha] pl-[52px] space-y-2 text-zinc-400 text-[14px] leading-relaxed mt-2.5">
              <li>Bodily injury, illness, disease, disability, hospitalisation, or death of the Insured or any third party;</li>
              <li>
                Epidemic, pandemic, or public-health emergency declarations (including WHO or government-declared
                outbreaks), and income loss arising primarily from disease-related restrictions, quarantine, or
                hospitalisation, except where a separate Parametric Trigger in §3 independently fires for the
                Insured{"'"}s Primary Zone during the Coverage Period;
              </li>
              <li>Loss of life or accidental death benefits;</li>
              <li>Damage to, repair of, or replacement of any motor vehicle, bicycle, or equipment;</li>
              <li>Personal accident coverage of any nature;</li>
              <li>Income loss arising from the Insured{"'"}s voluntary decision not to work, app deactivation,
                account suspension, or platform-imposed restrictions;</li>
              <li>Disruptions occurring outside the declared Primary Zone;</li>
              <li>
                War, invasion, act of foreign enemy, hostilities, civil war, rebellion, revolution, insurrection,
                military or usurped power, or mutiny;
              </li>
              <li>Nuclear reaction, nuclear radiation, or radioactive contamination;</li>
              <li>
                Terrorism or sabotage (unless specifically endorsed by endorsement to this Policy), and losses
                attributable to trade or economic sanctions prohibiting payment;
              </li>
              <li>
                Cyber attack, data breach, or widespread failure of telecommunications, electrical grid, or internet
                infrastructure, except where an Insured Peril in §3 is independently satisfied by published
                third-party indices;
              </li>
              <li>Fraudulent or deliberately fabricated claims, including GPS spoofing or location manipulation;</li>
              <li>Losses already indemnified under any other insurance policy or government compensation scheme.</li>
            </ul>
            <div className="ml-10 mt-6 bg-gradient-to-r from-uber-yellow/10 to-transparent border-l-[3px] border-uber-yellow rounded-r-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-uber-yellow shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-uber-yellow uppercase tracking-wider mb-1">Important Notice</h4>
                  <p className="text-[14px] text-zinc-300 leading-relaxed">
                    This product strictly covers loss of income due to external disruptions only. It is not a health, life, accident, or motor insurance product.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section id="premium" icon={IndianRupee} number="5" title="Premium, Plan Tiers & Benefit Schedule">
            <Clause id="5.1">
              The weekly premium is payable in Indian Rupees (INR) in advance of the Coverage Period
              via the payment methods made available on the Oasis platform (Razorpay Checkout, test mode).
              No coverage is effective until the premium is received and confirmed.
            </Clause>
            <Clause id="5.2">
              The Insured shall select one of the following Plan tiers at the time of subscription:
            </Clause>
            
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-lg mt-4 ml-10">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-black/40">
                      <th className="text-left py-3 px-5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Plan</th>
                      <th className="text-right py-3 px-5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Premium/Week</th>
                      <th className="text-right py-3 px-5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Benefit/Event</th>
                      <th className="text-right py-3 px-5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Max Events/Week</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="py-3.5 px-5 text-white font-semibold">Basic <span className="text-[10px] bg-white/10 text-zinc-400 px-2 py-0.5 rounded-full ml-2 font-normal uppercase">L1</span></td>
                      <td className="py-3.5 px-5 text-right text-zinc-300 tabular-nums">₹49</td>
                      <td className="py-3.5 px-5 text-right text-zinc-300 tabular-nums">₹300</td>
                      <td className="py-3.5 px-5 text-right text-zinc-400 tabular-nums">1</td>
                    </tr>
                    <tr className="bg-uber-green/5">
                      <td className="py-3.5 px-5 text-white font-semibold flex items-center gap-2">Standard <span className="text-[10px] bg-uber-green/20 text-uber-green border border-uber-green/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Most Popular</span></td>
                      <td className="py-3.5 px-5 text-right text-uber-green font-bold tabular-nums">₹99</td>
                      <td className="py-3.5 px-5 text-right text-zinc-200 font-medium tabular-nums">₹700</td>
                      <td className="py-3.5 px-5 text-right text-zinc-400 tabular-nums">2</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-5 text-white font-semibold">Premium <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full ml-2 font-bold uppercase tracking-wider">Max</span></td>
                      <td className="py-3.5 px-5 text-right text-zinc-300 tabular-nums">₹199</td>
                      <td className="py-3.5 px-5 text-right text-zinc-300 tabular-nums">₹1,500</td>
                      <td className="py-3.5 px-5 text-right text-zinc-400 tabular-nums">3</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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

          <Section id="claims" icon={Clock} number="6" title="Claims Procedure & Settlement">
            <Clause id="6.1">
              <strong className="text-white font-medium">Automatic Triggering.</strong> No claims submission is required.
              When a Parametric Trigger threshold is breached and verified by independent data sources,
              eligible Insured persons shall automatically receive a claim notification. The system operates
              continuously without manual adjudication.
            </Clause>
            <Clause id="6.2">
              <strong className="text-white font-medium">Location Verification.</strong> Upon receipt of a claim notification,
              the Insured shall confirm their presence within the affected zone by submitting GPS coordinates
              through the Oasis mobile application within the Verification Window of forty-eight (48) hours.
              GPS accuracy must be within 100 metres.
            </Clause>
            <Clause id="6.3">
              <strong className="text-white font-medium">Settlement.</strong> Upon successful location verification, the
              Benefit Payment shall be credited to the Insured{"'"}s Oasis wallet in real-time. Withdrawal
              terms are as specified on the platform.
            </Clause>
            <Clause id="6.4">
              <strong className="text-white font-medium">Failure to Verify.</strong> If the Insured fails to complete location
              verification within the Verification Window, the claim shall remain in {'"'}pending{'"'} status
              and may be reviewed by the Company at its discretion.
            </Clause>
            <Clause id="6.5">
              <strong className="text-white font-medium">Self-Report.</strong> The Insured may also submit a self-report through
              the platform with photographic evidence and GPS data. Self-reports are subject to rate limits
              (maximum three per day) and are corroborated against real-time weather and traffic data before
              approval.
            </Clause>
          </Section>

          <Section id="fraud" icon={Scale} number="7" title="Fraud Prevention & Anti-Abuse">
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

          <Section id="cancellation" icon={Ban} number="8" title="Cancellation & Renewal">
            <Clause id="8.1">
              <strong className="text-white font-medium">Cancellation by Insured.</strong> The Insured may elect not to renew
              at the end of any Coverage Period. No refund of premium shall be payable for the current
              Coverage Period.
            </Clause>
            <Clause id="8.2">
              <strong className="text-white font-medium">Cancellation by Company.</strong> The Company may cancel this Policy
              by giving seven (7) days{"'"} written notice to the Insured (via the registered email or
              in-app notification). In such cases, a pro-rata refund of unearned premium shall be made.
            </Clause>
            <Clause id="8.3">
              <strong className="text-white font-medium">Renewal.</strong> This Policy does not auto-renew. The Insured must
              actively subscribe and pay the premium for each Coverage Period. The Company shall make
              premium recommendations available prior to the renewal date.
            </Clause>
          </Section>

          <Section id="general" icon={HelpCircle} number="9" title="General Conditions">
            <Clause id="9.1">
              <strong className="text-white font-medium">Duty of Disclosure.</strong> The Insured shall provide accurate information
              regarding their delivery platform, Primary Zone, and contact details. Any material misrepresentation
              may invalidate coverage under this Policy.
            </Clause>
            <Clause id="9.2">
              <strong className="text-white font-medium">Data Sources.</strong> The Company relies on third-party data providers
              (including Tomorrow.io, Open-Meteo, WAQI, TomTom, and NewsData.io) for Parametric Trigger
              verification. The Company shall not be liable for inaccuracies or outages in third-party
              data feeds, provided reasonable efforts are made to obtain reliable data.
            </Clause>
            <Clause id="9.3">
              <strong className="text-white font-medium">Dispute Resolution.</strong> Any dispute arising out of or in connection
              with this Policy shall first be raised through the Oasis support channel. If unresolved
              within thirty (30) days, the dispute shall be referred to arbitration in accordance with the
              Arbitration and Conciliation Act, 1996, with the seat of arbitration at Bengaluru, Karnataka.
            </Clause>
            <Clause id="9.4">
              <strong className="text-white font-medium">Governing Law.</strong> This Policy shall be governed by and construed in
              accordance with the laws of India. The courts of Bengaluru, Karnataka shall have exclusive
              jurisdiction.
            </Clause>
            <Clause id="9.5">
              <strong className="text-white font-medium">Amendments.</strong> The Company reserves the right to amend these terms
              upon reasonable notice to the Insured. Continued subscription after receiving notice of
              amendment constitutes acceptance of the revised terms.
            </Clause>
          </Section>

          <Section id="reserves" icon={Landmark} number="10" title="Actuarial Framework, Technical Reserves & Reinsurance">
            <Clause id="10.1">
              <strong className="text-white font-medium">Premium adequacy.</strong> Weekly premiums are calibrated to expected
              parametric loss costs for the Insured{"'"}s zone and behaviour, with loadings for volatility and
              expenses. The Oasis pricing engine applies an explicit <strong className="text-zinc-300">technical reserve
              load</strong> (disclosed in platform documentation) on top of core risk factors to reflect tail
              correlation and reporting lag.
            </Clause>
            <Clause id="10.2">
              <strong className="text-white font-medium">Technical reserves & IBNR.</strong> Benefit Payments are fixed and
              parametric; settlement is largely automated. The Company holds <strong className="text-zinc-300">technical
              reserves</strong> for incurred-but-not-reported exposures arising from the Verification Window,
              payment retries, and dispute resolution. Aggregate weekly Benefit caps (§5.4) bound maximum weekly
              gross outgo per Insured.
            </Clause>
            <Clause id="10.3">
              <strong className="text-white font-medium">Reinsurance (outward).</strong> At portfolio scale, the Company intends to
              cede risk through <strong className="text-zinc-300">quota-share treaties</strong> to stabilise loss ratios
              across zones, supplemented by <strong className="text-zinc-300">catastrophe excess-of-loss</strong> cover
              for correlated weather and civil-disruption events. Specific reinsurer panels, retentions, and limits
              shall be filed as required by applicable regulations.
            </Clause>
            <Clause id="10.4">
              <strong className="text-white font-medium">No savings component.</strong> This Policy is pure protection; there is no
              surrender value, maturity benefit, or investment return.
            </Clause>
          </Section>
        </div>

        {/* Regulatory Footer */}
        <div className="pt-8 mb-16 border-t border-white/10">
          <div className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-uber-green/5 blur-3xl pointer-events-none" aria-hidden />
            <h4 className="text-[12px] font-bold text-zinc-300 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Scale className="w-3.5 h-3.5" /> Regulatory Disclaimer
            </h4>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              This is a parametric insurance product designed for the Indian Q-commerce delivery segment. Product features,
              pricing, and trigger mechanisms are subject to regulatory approvals. For grievances,
              contact <strong className="font-medium text-zinc-400">support@oasis.insure</strong>. This document constitutes
              the complete Policy Wording and supersedes all prior communications.
            </p>
          </div>
        </div>

      </div>

      {/* Sticky Table of Contents (Desktop Only) */}
      <div className="hidden xl:block sticky top-24 pl-8 border-l border-white/10">
        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-6">On this page</h4>
        <nav className="space-y-3">
          {TOC_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="group flex gap-3 items-baseline text-[13px] text-zinc-400 hover:text-white transition-colors"
            >
              <span className="text-[10px] font-mono text-zinc-600 group-hover:text-uber-green transition-colors leading-none shrink-0 w-3">{item.number}</span>
              <span className="leading-snug">{item.title}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
