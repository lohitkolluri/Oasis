import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlanPricingTimelineRow, PlanTierKey } from '@/components/admin/PlanPricingTimelineTable';
import { PlanPricingTimelineTable } from '@/components/admin/PlanPricingTimelineTable';
import { PlanPricingForecastChartLazy } from '@/components/admin/PlanPricingForecastChartLazy';
import { WEEKLY_POLICY_EARNED_PREMIUM_STATUSES } from '@/lib/config/constants';
import { getISTCurrentCoverageWeekMondayStart, getISTDateString } from '@/lib/datetime/ist';
import { addDays } from '@/lib/utils/date';
import { getPolicyWeekRange } from '@/lib/utils/policy-week';

export const dynamic = 'force-dynamic';

type PlanPackage = Record<string, any>;

/** Monday YYYY-MM-DD (IST) for the policy week containing `date`. */
function istPolicyWeekMondayYmd(date: Date): string {
  return getISTDateString(getISTCurrentCoverageWeekMondayStart(date));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export default async function PlansPage() {
  const supabase = createAdminClient();

  let plans: PlanPackage[] = [];
  try {
    const { data } = await supabase
      .from('plan_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    plans = (data ?? []) as PlanPackage[];
  } catch {
    plans = [];
  }

  const { data: policies } = await supabase
    .from('weekly_policies')
    .select('id, plan_id, weekly_premium_inr')
    .eq('is_active', true)
    .in('payment_status', [...WEEKLY_POLICY_EARNED_PREMIUM_STATUSES]);

  const { data: claims } = await supabase
    .from('parametric_claims')
    .select('policy_id, payout_amount_inr');

  const policyRows =
    (policies ?? []) as { plan_id: string | null; weekly_premium_inr: number }[];
  const claimRows =
    (claims ?? []) as { policy_id: string; payout_amount_inr: number }[];

  const premiumByPlan = new Map<string, { premium: number; policies: number }>();
  for (const p of policyRows) {
    if (!p.plan_id) continue;
    const bucket = premiumByPlan.get(p.plan_id) ?? {
      premium: 0,
      policies: 0,
    };
    bucket.premium += Number(p.weekly_premium_inr);
    bucket.policies += 1;
    premiumByPlan.set(p.plan_id, bucket);
  }

  const payoutsByPlan = new Map<string, number>();
  if (policyRows.length > 0 && claimRows.length > 0) {
    const planByPolicy = new Map<string, string>();
    (policies ?? []).forEach((p: any) => {
      if (p.id && p.plan_id) {
        planByPolicy.set(p.id as string, p.plan_id as string);
      }
    });
    for (const c of claimRows) {
      const planId = planByPolicy.get(c.policy_id);
      if (!planId) continue;
      payoutsByPlan.set(
        planId,
        (payoutsByPlan.get(planId) ?? 0) + Number(c.payout_amount_inr),
      );
    }
  }

  const tiers = plans.length > 0 ? plans.length : 3;

  const activePlans = plans
    .map((p) => ({
      id: String(p.id),
      slug: String(p.slug ?? ''),
      name: String(p.name ?? p.label ?? p.tier ?? 'Plan'),
      sortOrder: Number(p.sort_order ?? 0),
    }))
    .filter((p) => !!p.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const now = new Date();
  /** Same week key as `weekly-premium` cron (`getPolicyWeekRange()`). */
  const forecastWeekStart = getPolicyWeekRange(now).start;
  const currentWeekStart = istPolicyWeekMondayYmd(now);
  const sinceIso = addDays(currentWeekStart, -7 * 23);

  const [snapshotsRes, policiesPaidRes, recsRes] = await Promise.all([
    supabase
      .from('plan_pricing_snapshots')
      .select('week_start_date, plan_id, weekly_premium_inr, source')
      .gte('week_start_date', sinceIso)
      .order('week_start_date', { ascending: false }),
    supabase
      .from('weekly_policies')
      .select('week_start_date, plan_id, payment_status')
      .gte('week_start_date', sinceIso)
      .in('payment_status', [...WEEKLY_POLICY_EARNED_PREMIUM_STATUSES]),
    supabase
      .from('premium_recommendations')
      .select('recommended_premium_inr')
      .eq('week_start_date', forecastWeekStart),
  ]);

  const dataErrors: Array<{ label: string; message: string }> = [];
  if (snapshotsRes.error) {
    dataErrors.push({
      label: 'plan_pricing_snapshots',
      message: snapshotsRes.error.message,
    });
  }
  if (policiesPaidRes.error) {
    dataErrors.push({
      label: 'weekly_policies',
      message: policiesPaidRes.error.message,
    });
  }
  if (recsRes.error) {
    dataErrors.push({
      label: 'premium_recommendations',
      message: recsRes.error.message,
    });
  }

  type RecSource = 'target' | 'latest' | 'catalog';
  let recSource: RecSource = 'target';
  let usedWeekForRecs = forecastWeekStart;
  let recRows = (recsRes.data ?? []) as Array<{ recommended_premium_inr: number }>;

  if (recRows.length === 0 && !recsRes.error) {
    const { data: maxRow, error: maxErr } = await supabase
      .from('premium_recommendations')
      .select('week_start_date')
      .order('week_start_date', { ascending: false })
      .limit(1);
    if (!maxErr && maxRow?.[0]?.week_start_date) {
      const lw = maxRow[0].week_start_date as string;
      if (lw !== forecastWeekStart) {
        const { data: latestRecs } = await supabase
          .from('premium_recommendations')
          .select('recommended_premium_inr')
          .eq('week_start_date', lw);
        recRows = (latestRecs ?? []) as Array<{ recommended_premium_inr: number }>;
        if (recRows.length > 0) {
          recSource = 'latest';
          usedWeekForRecs = lw;
        }
      }
    }
  }

  const snapshots = (snapshotsRes.data ?? []) as Array<{
    week_start_date: string;
    plan_id: string;
    weekly_premium_inr: number;
    source?: string | null;
  }>;

  const paidPolicies = (policiesPaidRes.data ?? []) as Array<{
    week_start_date: string;
    plan_id: string | null;
  }>;

  const subsByWeekPlan = new Map<string, number>();
  for (const p of paidPolicies) {
    if (!p.plan_id) continue;
    const key = `${p.week_start_date}:${p.plan_id}`;
    subsByWeekPlan.set(key, (subsByWeekPlan.get(key) ?? 0) + 1);
  }

  const priceByWeekPlan = new Map<string, number>();
  for (const s of snapshots) {
    const key = `${s.week_start_date}:${s.plan_id}`;
    priceByWeekPlan.set(key, Number(s.weekly_premium_inr));
  }

  // Build week list from DB-returned week_start_date values to avoid timezone/ISO-week mismatches.
  const weekStartSet = new Set<string>();
  snapshots.forEach((s) => weekStartSet.add(s.week_start_date));
  paidPolicies.forEach((p) => weekStartSet.add(p.week_start_date));

  const weekStarts = Array.from(weekStartSet).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
  // Ensure we have a consistent 24-week window for the chart/table.
  if (weekStarts.length > 0) {
    while (weekStarts.length < 24) {
      const last = weekStarts[weekStarts.length - 1]!;
      weekStarts.push(addDays(last, -7));
    }
  } else {
    const base = istPolicyWeekMondayYmd(now);
    for (let i = 0; i < 24; i++) weekStarts.push(addDays(base, -7 * i));
  }

  const tierOrder: Array<{ key: PlanTierKey; label: string; planId: string }> =
    activePlans.map((p) => ({
      key: p.slug || p.id,
      label: p.name,
      planId: p.id,
    }));

  const timelineRows: PlanPricingTimelineRow[] = weekStarts.map((w) => {
    const tiers: Record<
      PlanTierKey,
      { label: string; weeklyPremiumInr: number | null; subscriberCount: number }
    > = {};
    for (const t of tierOrder) {
      const k = `${w}:${t.planId}`;
      tiers[t.key] = {
        label: t.label,
        weeklyPremiumInr: priceByWeekPlan.get(k) ?? null,
        subscriberCount: subsByWeekPlan.get(k) ?? 0,
      };
    }
    return { weekStartDate: w, tiers };
  });

  // Forecast: premium_recommendations for enrollment week `forecastWeekStart` (cron-aligned), else latest DB week, else catalog.
  const recValues = recRows
    .map((r) => Number(r.recommended_premium_inr))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const predictedByTier = new Map<PlanTierKey, number>();
  if (recValues.length > 0 && tierOrder.length >= 3) {
    const p30 = percentile(recValues, 0.3);
    const p60 = percentile(recValues, 0.6);
    const p85 = percentile(recValues, 0.85);
    const clamp = (n: number) => Math.round(Math.max(1, Math.min(9999, n)));
    const keys = tierOrder.map((t) => t.key);
    predictedByTier.set(keys[0]!, clamp(p30));
    predictedByTier.set(keys[1]!, clamp(p60));
    predictedByTier.set(keys[2]!, clamp(p85));
  } else if (recValues.length > 0 && tierOrder.length > 0) {
    // Fallback: evenly-spaced percentiles across tiers.
    const clamp = (n: number) => Math.round(Math.max(1, Math.min(9999, n)));
    tierOrder.forEach((t, i) => {
      const p = tierOrder.length === 1 ? 0.6 : i / (tierOrder.length - 1);
      predictedByTier.set(t.key, clamp(percentile(recValues, p)));
    });
  }

  if (predictedByTier.size === 0 && tierOrder.length > 0) {
    const clamp = (n: number) => Math.round(Math.max(1, Math.min(9999, n)));
    for (const t of tierOrder.slice(0, 3)) {
      const plan = plans.find((p) => String(p.id) === t.planId);
      const v =
        plan?.weekly_premium_inr ??
        plan?.weekly_price_inr ??
        plan?.price_inr ??
        null;
      if (v != null && Number.isFinite(Number(v))) {
        predictedByTier.set(t.key, clamp(Number(v)));
      }
    }
    if (predictedByTier.size > 0) recSource = 'catalog';
  }

  const forecastTiers = tierOrder.slice(0, 3).map((t, idx) => ({
    key: t.key,
    label: t.label,
    color: idx === 0 ? '#7dd3fc' : idx === 1 ? '#a78bfa' : '#22c55e',
  }));

  const lastHistorical = timelineRows[0];
  const points = [...timelineRows]
    .reverse()
    .map((r) => {
      const point: Record<string, any> = { weekStartDate: r.weekStartDate };
      for (const t of forecastTiers) {
        point[`${t.key}Actual`] = r.tiers[t.key]?.weeklyPremiumInr ?? null;
        point[`${t.key}Pred`] = null;
      }
      return point as any;
    });

  if (points.length > 0) {
    const lastActualPoint = points[points.length - 1] as any;

    // Render a short forward forecast window (next N weeks) so it's clearly "future",
    // not just a single point that can look like the current price.
    const FORECAST_WEEKS = 4;
    let carry = new Map<PlanTierKey, number>();
    for (const t of forecastTiers) {
      const v = predictedByTier.get(t.key);
      if (v != null) carry.set(t.key, v);
    }

    // Only draw forecast when we have any recommendation-driven prediction.
    if (carry.size > 0) {
      // Connect dashed forecast from the last actual point.
      for (const t of forecastTiers) {
        const actualLast = lastActualPoint?.[`${t.key}Actual`] ?? null;
        if (actualLast != null) lastActualPoint[`${t.key}Pred`] = actualLast;
      }

      for (let i = 0; i < FORECAST_WEEKS; i++) {
        const wk = addDays(forecastWeekStart, 7 * i);
        const fp: Record<string, any> = { weekStartDate: wk, isForecast: true };
        for (const t of forecastTiers) {
          fp[`${t.key}Actual`] = null;
          fp[`${t.key}Pred`] = carry.get(t.key) ?? null;
        }
        points.push(fp as any);
      }
    }
  }

  const forecastCaption =
    recSource === 'target' && recValues.length > 0
      ? `Model week ${usedWeekForRecs} · ${recValues.length} profiles`
      : recSource === 'latest' && recValues.length > 0
        ? `Showing ${usedWeekForRecs} (${recValues.length} profiles); target ${forecastWeekStart}`
        : recSource === 'catalog' && predictedByTier.size > 0
          ? `Catalog prices · target week ${forecastWeekStart}`
          : `No model rows · target ${forecastWeekStart}`;

  const targetWeekModelSnapshots = snapshots.filter(
    (s) => s.week_start_date === forecastWeekStart && s.source === 'model',
  ).length;
  const pricingDataEpoch = [
    forecastWeekStart,
    recSource,
    usedWeekForRecs,
    recValues.length,
    targetWeekModelSnapshots,
    snapshots.length,
  ].join('|');

  return (
    <div className="space-y-6">
      <AdminPageTitle
        title="Plans & Pricing Performance"
        help="Plan tiers (Basic / Standard / Premium) are defined in plan_packages with weekly premium and per-claim payout caps. Charts compare modeled premiums, recommendations, and uptake. All customer-facing pricing is weekly — do not quote monthly or annual totals as products."
        description="Weekly pricing for Basic, Standard, and Premium cohorts."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard
          title="Active plan tiers"
          label="Configured in plan_packages"
          value={tiers}
          accent="cyan"
          animateValue
        />
        <KPICard
          title="Modeled weekly premium"
          label="Sum of active plan premiums"
          value={`₹${Array.from(premiumByPlan.values())
            .reduce((s, v) => s + v.premium, 0)
            .toLocaleString('en-IN')}`}
          accent="emerald"
          animateValue
        />
        <KPICard
          title="Only income-loss coverage"
          label="No health, life, accidents, or vehicle repair"
          value="Scope locked"
          accent="purple"
        />
      </div>

      {dataErrors.length > 0 && (
        <Card
          variant="default"
          padding="lg"
          className="bg-[#111111] border-[#262626]"
        >
          <p className="text-sm font-semibold text-white">
            Pricing widgets are not fully configured
          </p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            One or more required tables/columns are missing in your database. Apply migrations and re-run the seed.
          </p>
          <div className="mt-3 space-y-2">
            {dataErrors.map((e) => (
              <div
                key={e.label}
                className="rounded-lg border border-[#2d2d2d] bg-[#0b0b0b] px-3 py-2"
              >
                <p className="text-[11px] font-semibold text-[#e5e7eb]">
                  {e.label}
                </p>
                <p className="text-[11px] text-[#6b7280] mt-0.5">
                  {e.message}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <PlanPricingForecastChartLazy
        key={`forecast:${pricingDataEpoch}`}
        tiers={forecastTiers}
        points={points as any}
        caption={forecastCaption}
        forecastGenerateWeekStart={
          recSource !== 'target' || recValues.length === 0 ? forecastWeekStart : null
        }
      />

      <PlanPricingTimelineTable
        key={`timeline:${pricingDataEpoch}`}
        rows={timelineRows}
        tierOrder={tierOrder}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {plans.length === 0 ? (
          <Card
            variant="default"
            padding="lg"
            className="bg-[#111111] border-[#262626]"
          >
            <p className="text-sm font-semibold text-white">
              No active plans configured
            </p>
            <p className="mt-1 text-xs text-[#9ca3af]">
              Use the <code>plan_packages</code> table to define Basic,
              Standard, and Premium weekly plans with modeled payouts.
            </p>
          </Card>
        ) : (
          plans.map((plan) => {
            const name =
              plan.name ??
              plan.label ??
              plan.tier ??
              `Plan ${String(plan.id).slice(0, 4)}`;
            const weeklyPrice =
              plan.weekly_price_inr ??
              plan.weekly_premium_inr ??
              plan.price_inr ??
              null;
            const description =
              plan.description ?? plan.summary ?? null;

            const agg = premiumByPlan.get(plan.id as string) ?? {
              premium: 0,
              policies: 0,
            };
            const payouts = payoutsByPlan.get(plan.id as string) ?? 0;
            const lossRatio =
              agg.premium > 0 ? (payouts / agg.premium) * 100 : null;

            return (
              <Card
                key={plan.id}
                variant="default"
                padding="lg"
                className="bg-[#111111] border-[#262626] flex flex-col gap-3"
              >
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6b7280]">
                  {String(plan.tier ?? '').toUpperCase() || 'PLAN'}
                </p>
                <p className="text-lg font-semibold text-white">{name}</p>
                {description && (
                  <p className="text-xs text-[#9ca3af]">{description}</p>
                )}
                <div className="mt-auto pt-2">
                  <p className="text-[11px] text-[#6b7280] uppercase tracking-[0.18em] mb-1">
                    Weekly price
                  </p>
                  <p className="text-xl font-bold text-white">
                    {weeklyPrice != null
                      ? `₹${Number(weeklyPrice).toLocaleString('en-IN')}`
                      : 'Configure in DB'}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#9ca3af]">
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[#6b7280] mb-0.5">
                        Active riders
                      </p>
                      <p className="font-semibold text-white tabular-nums">
                        {agg.policies}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[#6b7280] mb-0.5">
                        Modeled premium
                      </p>
                      <p className="font-semibold text-white tabular-nums">
                        ₹{agg.premium.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[#6b7280] mb-0.5">
                        Payouts
                      </p>
                      <p className="font-semibold text-[#e5e7eb] tabular-nums">
                        ₹{payouts.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[#6b7280] mb-0.5">
                        Loss ratio
                      </p>
                      <p className="font-semibold text-[#e5e7eb] tabular-nums">
                        {lossRatio != null ? `${lossRatio.toFixed(1)}%` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

