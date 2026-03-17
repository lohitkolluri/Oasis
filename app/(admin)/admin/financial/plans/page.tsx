import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';

type PlanPackage = Record<string, any>;

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

