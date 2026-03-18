import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlanPricingTimelineRow, PlanTierKey } from '@/components/admin/PlanPricingTimelineTable';
import { PlanPricingTimelineTable } from '@/components/admin/PlanPricingTimelineTable';
import { PlanPricingForecastChartLazy } from '@/components/admin/PlanPricingForecastChartLazy';

type PlanPackage = Record<string, any>;

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function nextMondayFrom(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  dt.setDate(dt.getDate() + daysUntilMonday);
  dt.setHours(0, 0, 0, 0);
  return dt;
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
    .select('plan_id, weekly_premium_inr')
    .eq('is_active', true);

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
  const currentWeekStart = startOfWeekMonday(now);
  const since24w = new Date(currentWeekStart);
  since24w.setDate(currentWeekStart.getDate() - 7 * 23);
  const sinceIso = toDateString(since24w);

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
      .in('payment_status', ['paid', 'demo']),
    (async () => {
      const nextWeekStart = toDateString(nextMondayFrom(now));
      return supabase
        .from('premium_recommendations')
        .select('recommended_premium_inr')
        .eq('week_start_date', nextWeekStart);
    })(),
  ]);

  const snapshots = (snapshotsRes.data ?? []) as Array<{
    week_start_date: string;
    plan_id: string;
    weekly_premium_inr: number;
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

  const weekStarts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() - i * 7);
    weekStarts.push(toDateString(d));
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

  const nextWeekStart = toDateString(nextMondayFrom(now));
  const recs = (recsRes.data ?? []) as Array<{ recommended_premium_inr: number }>;
  const recValues = recs
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
    const last = points[points.length - 1] as any;
    const nextPoint: Record<string, any> = { weekStartDate: nextWeekStart, isForecast: true };
    for (const t of forecastTiers) {
      const actualLast = last?.[`${t.key}Actual`] ?? null;
      nextPoint[`${t.key}Actual`] = null;
      nextPoint[`${t.key}Pred`] = predictedByTier.has(t.key)
        ? predictedByTier.get(t.key)
        : null;
      // Connect dashed forecast from last actual point
      if (actualLast != null) {
        last[`${t.key}Pred`] = actualLast;
      }
    }
    points.push(nextPoint as any);
  }

  const forecastCaption =
    recValues.length > 0 ? `Based on premium recommendations (profiles: ${recValues.length})` : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Plans &amp; Pricing Performance
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Weekly pricing for Basic, Standard, and Premium cohorts.
        </p>
      </div>

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

      <PlanPricingForecastChartLazy
        tiers={forecastTiers}
        points={points as any}
        caption={forecastCaption}
      />

      <PlanPricingTimelineTable rows={timelineRows} tierOrder={tierOrder} />

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

