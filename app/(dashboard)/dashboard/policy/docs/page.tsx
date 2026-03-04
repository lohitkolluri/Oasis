import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

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

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Policy Terms & Conditions</h1>
        <p className="text-zinc-500 text-sm">
          Oasis Weekly Parametric Income Protection Policy — please read in full before subscribing.
        </p>
      </div>

      <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-sm">
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-500" />
            1. Definitions
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-zinc-400">
            <li>
              <strong className="text-zinc-300">Coverage Period</strong> — The seven-day period
              (Monday 00:00 to Sunday 23:59 IST) for which the policy is active.
            </li>
            <li>
              <strong className="text-zinc-300">Parametric Trigger</strong> — An objective,
              externally verifiable event (e.g., weather threshold, traffic index) used to
              determine payout eligibility.
            </li>
            <li>
              <strong className="text-zinc-300">Primary Zone</strong> — The delivery zone or
              geofence you have declared as your primary area of operations.
            </li>
            <li>
              <strong className="text-zinc-300">External Disruption</strong> — An event outside
              your control that materially affects your ability to complete deliveries, as defined
              under Covered Events.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. What Is Covered</h2>
          <p className="text-zinc-400 mb-3">
            This policy provides income protection in the form of a fixed payout when a covered
            parametric trigger is met during your coverage period. Payouts are determined by
            automated verification against third-party data sources (weather, traffic, news)
            and are not based on individual proof of loss.
          </p>
          <p className="text-zinc-400 font-medium text-zinc-300">
            Covered Events include:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-zinc-400 mt-2">
            <li>Extreme heat above defined thresholds for a sustained period in your primary zone</li>
            <li>Heavy rain or waterlogging that affects road/ delivery access</li>
            <li>Severe air quality (AQI) levels that restrict outdoor activity</li>
            <li>Zone curfews, strikes, or civil unrest verified by news sources</li>
            <li>Traffic gridlock or road closures affecting your declared zone</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Exclusions</h2>
          <p className="text-zinc-400 mb-3">
            This policy explicitly excludes the following. No benefits are payable for:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-zinc-400">
            <li>Medical expenses, illness, injury, or death</li>
            <li>Life insurance or accidental death benefits</li>
            <li>Motor vehicle damage, repairs, or replacement</li>
            <li>Personal accidents or disability unrelated to the parametric triggers</li>
            <li>Income loss arising from factors other than the defined covered events</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Premium & Billing</h2>
          <p className="text-zinc-400">
            Premium is payable weekly in advance. The amount may vary based on your primary
            zone, historical disruption frequency, and forecast data. Payment is due before
            the start of the coverage period. Failure to pay results in no coverage for that week.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Claims & Payouts</h2>
          <p className="text-zinc-400 mb-3">
            This is a parametric product. Payouts are triggered automatically when the system
            verifies that a covered event has occurred in your primary zone during your coverage
            period. No claim form or manual submission is required. Credited amounts appear in
            your Oasis wallet and may be withdrawn per platform terms.
          </p>
          <p className="text-zinc-400">
            Disputes regarding trigger verification may be raised via support. Oasis reserves
            the right to reject payouts where fraud, misrepresentation, or data error is found.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Cancellation</h2>
          <p className="text-zinc-400">
            You may cancel at any time. No refund of premium for the current week. Coverage
            ceases at the end of the paid period. Oasis may cancel or modify terms with notice
            as per applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. General</h2>
          <p className="text-zinc-400">
            By subscribing, you confirm that the information provided (platform, zone, contact
            details) is accurate. Misrepresentation may invalidate coverage. This document
            constitutes the policy wording. Refer to the platform for payment and technical
            terms.
          </p>
        </section>
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
