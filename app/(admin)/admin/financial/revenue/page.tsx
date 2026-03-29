import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WEEKLY_POLICY_EARNED_PREMIUM_STATUSES } from '@/lib/config/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { RevenueCharts } from '@/components/admin/RevenueCharts';

type PolicyRow = {
  id: string;
  weekly_premium_inr: number;
  plan_packages: { slug: string | null; name: string | null } | null;
  profiles: { primary_zone_geofence: unknown } | null;
};

type ClaimRow = {
  policy_id: string;
  payout_amount_inr: number;
};

type ZoneBucket = {
  zone: string;
  premium: number;
  payouts: number;
  policyCount: number;
};

type PlanBucket = {
  slug: string;
  name: string;
  premium: number;
  payouts: number;
  policyCount: number;
};

export default async function RevenuePage() {
  const supabase = createAdminClient();

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceIso = since.toISOString();

  const [policiesRes, claimsRes] = await Promise.all([
    supabase
      .from('weekly_policies')
      .select('id, weekly_premium_inr, plan_packages(slug,name), profiles(primary_zone_geofence)')
      .gte('created_at', sinceIso)
      .eq('is_active', true)
      .in('payment_status', [...WEEKLY_POLICY_EARNED_PREMIUM_STATUSES]),
    supabase
      .from('parametric_claims')
      .select('policy_id, payout_amount_inr')
      .gte('created_at', sinceIso),
  ]);

  const policies = (policiesRes.data ?? []) as unknown as PolicyRow[];
  const claims = (claimsRes.data ?? []) as unknown as ClaimRow[];

  const policyIds = policies.map((p) => p.id);
  const claimsByPolicy = new Map<string, number>();
  for (const c of claims) {
    if (!policyIds.includes(c.policy_id)) continue;
    claimsByPolicy.set(
      c.policy_id,
      (claimsByPolicy.get(c.policy_id) ?? 0) + Number(c.payout_amount_inr),
    );
  }

  const zoneBuckets = new Map<string, ZoneBucket>();
  const planBuckets = new Map<string, PlanBucket>();

  let totalPremium = 0;
  let totalPayouts = 0;

  for (const p of policies) {
    const premium = Number(p.weekly_premium_inr);
    const payouts = claimsByPolicy.get(p.id) ?? 0;
    totalPremium += premium;
    totalPayouts += payouts;

    const rawZone = p.profiles?.primary_zone_geofence as
      | string
      | { name?: string; label?: string; zone_name?: string }
      | null
      | undefined;

    let zoneKey = 'Unspecified zone';
    if (rawZone) {
      if (typeof rawZone === 'string') {
        zoneKey = rawZone;
      } else if (typeof rawZone === 'object') {
        zoneKey =
          rawZone.name ||
          rawZone.label ||
          rawZone.zone_name ||
          'Unspecified zone';
      }
    }
    if (!zoneBuckets.has(zoneKey)) {
      zoneBuckets.set(zoneKey, {
        zone: zoneKey,
        premium: 0,
        payouts: 0,
        policyCount: 0,
      });
    }
    const zb = zoneBuckets.get(zoneKey)!;
    zb.premium += premium;
    zb.payouts += payouts;
    zb.policyCount += 1;

    const planSlug =
      p.plan_packages?.slug ??
      p.plan_packages?.name?.toLowerCase() ??
      'unassigned';
    const planName =
      p.plan_packages?.name ??
      (planSlug === 'unassigned' ? 'Unassigned plan' : planSlug);

    if (!planBuckets.has(planSlug)) {
      planBuckets.set(planSlug, {
        slug: planSlug,
        name: planName,
        premium: 0,
        payouts: 0,
        policyCount: 0,
      });
    }
    const pb = planBuckets.get(planSlug)!;
    pb.premium += premium;
    pb.payouts += payouts;
    pb.policyCount += 1;
  }

  const lossRatio =
    totalPremium > 0 ? ((totalPayouts / totalPremium) * 100).toFixed(1) : null;

  const zones = Array.from(zoneBuckets.values()).sort((a, b) => {
    const lrA = a.premium > 0 ? a.payouts / a.premium : 0;
    const lrB = b.premium > 0 ? b.payouts / b.premium : 0;
    return lrB - lrA;
  });

  const plans = Array.from(planBuckets.values()).sort(
    (a, b) => (b.premium || 0) - (a.premium || 0),
  );

  return (
    <div className="space-y-6">
      <AdminPageTitle
        title="Revenue & Loss Ratio"
        help="Rolling view of earned weekly premium (paid or demo policies created in the window) against parametric claim payouts, broken down by rider zone label and plan tier. Loss ratio = payouts ÷ premium. Useful for portfolio monitoring — not the same as the reserves stress cohort view."
        description="Weekly premium collected vs. parametric payouts over the last 90 days."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard
          title="Modeled premium"
          label="Active weekly policies · last 90 days"
          value={`₹${totalPremium.toLocaleString('en-IN')}`}
          accent="cyan"
          animateValue
        />
        <KPICard
          title="Net margin"
          label="Premium − parametric payouts"
          value={`₹${(totalPremium - totalPayouts).toLocaleString('en-IN')}`}
          accent="emerald"
          animateValue
        />
        <KPICard
          title="Portfolio loss ratio"
          label="Payouts ÷ premium (last 90 days)"
          value={lossRatio != null ? `${lossRatio}%` : '—'}
          accent="purple"
          animateValue={lossRatio != null}
        />
      </div>

      <RevenueCharts zones={zones} plans={plans} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="default" padding="none">
          <div className="border-b border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              Zones by loss ratio
            </p>
            <span className="text-[11px] text-[#555] tabular-nums">
              Top {Math.min(zones.length, 8)} zones · last 90 days
            </span>
          </div>
          {zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <p className="text-sm font-medium text-[#555]">
                No active policies with zones yet
              </p>
              <p className="text-xs text-[#444] mt-1">
                Once riders have zone geofences, you&apos;ll see which areas are
                most loss-making.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                  <TableHead>Zone</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="text-right">Payouts</TableHead>
                  <TableHead className="text-right">Loss ratio</TableHead>
                  <TableHead className="text-right">Policies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.slice(0, 8).map((z) => {
                  const lr = z.premium > 0 ? (z.payouts / z.premium) * 100 : 0;
                  return (
                    <TableRow key={z.zone} className="border-[#2d2d2d]">
                      <TableCell className="text-xs text-[#e5e7eb]">
                        {z.zone}
                      </TableCell>
                      <TableCell className="text-right text-xs text-white tabular-nums">
                        ₹{z.premium.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#e5e7eb] tabular-nums">
                        ₹{z.payouts.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums">
                        {z.premium > 0 ? `${lr.toFixed(1)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums">
                        {z.policyCount}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card variant="default" padding="none">
          <div className="border-b border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              Plan tier performance
            </p>
            <span className="text-[11px] text-[#555] tabular-nums">
              Basic · Standard · Premium
            </span>
          </div>
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <p className="text-sm font-medium text-[#555]">
                No active plans yet
              </p>
              <p className="text-xs text-[#444] mt-1">
                When riders are assigned to plan tiers, you&apos;ll see per-tier
                loss ratios here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="text-right">Payouts</TableHead>
                  <TableHead className="text-right">Loss ratio</TableHead>
                  <TableHead className="text-right">Policies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => {
                  const lr =
                    p.premium > 0 ? (p.payouts / p.premium) * 100 : null;
                  return (
                    <TableRow key={p.slug} className="border-[#2d2d2d]">
                      <TableCell className="text-xs text-[#e5e7eb]">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-right text-xs text-white tabular-nums">
                        ₹{p.premium.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#e5e7eb] tabular-nums">
                        ₹{p.payouts.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums">
                        {lr != null ? `${lr.toFixed(1)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums">
                        {p.policyCount}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

