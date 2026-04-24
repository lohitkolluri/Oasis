import { PolicySubscribeForm } from '@/components/rider/PolicySubscribeForm';
import { WEEKLY_POLICY_EARNED_PREMIUM_STATUSES } from '@/lib/config/constants';
import { addCalendarDaysIST } from '@/lib/datetime/ist';
import { computeDynamicPlanQuotesForProfile } from '@/lib/ml/resolve-dynamic-plan-quotes';
import { createClient } from '@/lib/supabase/server';
import type { WeeklyPolicy } from '@/lib/types/database';
import { getCoverageWeekRange } from '@/lib/utils/policy-week';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

/** Always refetch after Razorpay return; avoids stale RSC for policy/coverage. */
export const dynamic = 'force-dynamic';

export default async function PolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { start: weekStart } = getCoverageWeekRange();
  // Pull a small window so we don't miss the current week even if there are many future/pending rows.
  const policySince = addCalendarDaysIST(weekStart, -21);

  const [{ data: policies }, { data: profile }, { data: plans }, dynamicQuotesBySlug] =
    await Promise.all([
      supabase
        .from('weekly_policies')
        .select(
          'id, profile_id, plan_id, week_start_date, week_end_date, weekly_premium_inr, is_active, payment_status, razorpay_payment_method, created_at, updated_at, plan_packages(name)',
        )
        .eq('profile_id', user.id)
        .gte('week_start_date', policySince)
        .order('week_start_date', { ascending: false })
        .limit(30),
      supabase
        .from('profiles')
        .select(
          'primary_zone_geofence, zone_latitude, zone_longitude, platform, auto_renew_enabled, razorpay_subscription_id',
        )
        .eq('id', user.id)
        .single(),
      supabase
        .from('plan_packages')
        .select(
          'id, slug, name, description, weekly_premium_inr, payout_per_claim_inr, max_claims_per_week, is_active, sort_order',
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      computeDynamicPlanQuotesForProfile(supabase, user.id, weekStart),
    ]);

  const premium = dynamicQuotesBySlug.standard?.weekly_premium_inr ?? 99;

  // Treat only this coverage week as active/purchased.
  // Past rows can remain `is_active=true` briefly after transitions, but should not block checkout.
  // Use the shared constant so analytics and UI never drift from the same "earned" definition.
  const earnedStatuses = new Set<string>(WEEKLY_POLICY_EARNED_PREMIUM_STATUSES);
  const activePolicy: (WeeklyPolicy & { plan_packages?: unknown }) | null =
    policies?.find(
      (p) =>
        p.week_start_date === weekStart &&
        (p.is_active || earnedStatuses.has(String(p.payment_status ?? ''))),
    ) ?? null;

  const planName =
    activePolicy?.plan_packages &&
    typeof activePolicy.plan_packages === 'object' &&
    activePolicy.plan_packages !== null
      ? ((activePolicy.plan_packages as { name?: string }).name ?? 'Weekly plan')
      : 'Weekly plan';

  const autoRenewEnabled = Boolean(profile?.auto_renew_enabled);

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 active:text-zinc-200 transition-colors min-h-[44px] -ml-1 px-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      {activePolicy ? (
        <>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Subscription details</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Your current coverage and payment details
            </p>
          </div>
          <PolicySubscribeForm
            profileId={user.id}
            activePolicy={activePolicy}
            planName={planName}
            existingPolicies={policies ?? []}
            plans={plans ?? []}
            suggestedPremium={premium}
            dynamicQuotesBySlug={dynamicQuotesBySlug}
            paymentSuccess={params.success === '1'}
            paymentCanceled={params.canceled === '1'}
            autoRenewEnabled={autoRenewEnabled}
          />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Weekly Policy</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                Subscribe for weekly parametric coverage
              </p>
            </div>
            <Link
              href="/dashboard/policy/docs"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-uber-green active:text-uber-green transition-colors shrink-0 min-h-[44px] px-1"
            >
              <FileText className="h-4 w-4" />
              Policy docs
            </Link>
          </div>
          <PolicySubscribeForm
            profileId={user.id}
            activePolicy={activePolicy}
            planName={planName}
            existingPolicies={policies ?? []}
            plans={plans ?? []}
            suggestedPremium={premium}
            dynamicQuotesBySlug={dynamicQuotesBySlug}
            paymentSuccess={params.success === '1'}
            paymentCanceled={params.canceled === '1'}
            autoRenewEnabled={autoRenewEnabled}
          />
        </>
      )}
    </div>
  );
}
