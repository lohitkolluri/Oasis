import { AdminInsights } from '@/components/admin/AdminInsights';
import { AdminLiveFeed } from '@/components/admin/AdminLiveFeed';
import { OverviewStatus } from '@/components/admin/OverviewStatus';
import { RunAdjudicatorButton } from '@/components/admin/RunAdjudicatorButton';
import { KPICard } from '@/components/ui/KPICard';
import { getNextWeekPrediction } from '@/lib/ml/next-week-risk';
import { createAdminClient } from '@/lib/supabase/admin';
import { BarChart3, FileCheck, ShieldAlert, Users } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: policies },
    { data: claims },
    { count: ridersCount },
    { data: claims24h },
  ] = await Promise.all([
    supabase.from('weekly_policies').select('weekly_premium_inr, is_active').eq('is_active', true),
    supabase.from('parametric_claims').select('payout_amount_inr, is_flagged'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .or('role.eq.rider,role.is.null'),
    supabase
      .from('parametric_claims')
      .select('payout_amount_inr, is_flagged')
      .gte('created_at', since24h),
  ]);

  let reportsCount = 0;
  try {
    const { count } = await supabase
      .from('rider_delivery_reports')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    reportsCount = count ?? 0;
  } catch {
    /* Table may not exist */
  }

  const totalPremiums = policies?.reduce((sum, p) => sum + Number(p.weekly_premium_inr), 0) ?? 0;
  const totalPayouts = claims?.reduce((sum, c) => sum + Number(c.payout_amount_inr), 0) ?? 0;
  const lossRatio = totalPremiums > 0 ? ((totalPayouts / totalPremiums) * 100).toFixed(1) : '0';
  const activePoliciesCount = policies?.length ?? 0;

  const claims24hCount = claims24h?.length ?? 0;
  const payouts24hTotal = claims24h?.reduce((s, c) => s + Number(c.payout_amount_inr), 0) ?? 0;
  const flagged24h = claims24h?.filter((c) => c.is_flagged).length ?? 0;
  const summary24h = { claims: claims24hCount, payoutsTotal: payouts24hTotal, flagged: flagged24h };

  const nextWeekPrediction = await getNextWeekPrediction(supabase);
  const riskValueColor = {
    low: 'text-[#22c55e]',
    medium: 'text-[#f59e0b]',
    high: 'text-[#ef4444]',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Overview</h1>
          <p className="text-sm text-[#666] mt-1">Platform analytics and operational controls</p>
        </div>
        <RunAdjudicatorButton />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Weekly Premiums"
          label="Collected"
          value={`₹${totalPremiums.toLocaleString('en-IN')}`}
          accent="cyan"
        />
        <KPICard
          title="Active Riders"
          label="Registered"
          value={ridersCount ?? 0}
          accent="violet"
        />
        <KPICard
          title="Policies Active"
          label="This week"
          value={activePoliciesCount}
          accent="blue"
        />
        <KPICard
          title="Loss Ratio"
          label={Number(lossRatio) > 80 ? 'Above threshold' : 'Within range'}
          value={`${lossRatio}%`}
          accent={Number(lossRatio) > 80 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Operations + Sidebar */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdminInsights />
        </div>
        <div className="space-y-4">
          {/* Outlook — insurance-friendly risk summary */}
          <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 flex items-center justify-center">
                <BarChart3 className="h-3.5 w-3.5 text-[#7dd3fc]" />
              </div>
              <p className="text-sm font-semibold text-white">7-day outlook</p>
            </div>
            <p className="text-[11px] text-[#666] mb-2">Claim risk across coverage zones</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`text-lg font-semibold capitalize ${
                  riskValueColor[nextWeekPrediction.riskLevel]
                }`}
              >
                {nextWeekPrediction.riskLevel}
              </span>
              <span className="text-xs text-[#555]">
                ({nextWeekPrediction.expectedClaimsRange} expected claims)
              </span>
            </div>
            {nextWeekPrediction.details && (
              <p className="text-xs text-[#666] mt-3 leading-relaxed border-t border-[#2d2d2d] pt-3">
                {nextWeekPrediction.details}
              </p>
            )}
            {nextWeekPrediction.aqiRisk && (
              <p className="text-[11px] text-[#f59e0b] mt-2">{nextWeekPrediction.aqiRisk}</p>
            )}
          </div>

          <OverviewStatus />

          {/* Quick links */}
          <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4">
            <p className="text-[11px] font-medium text-[#555] uppercase tracking-wider mb-3">
              Quick links
            </p>
            <div className="space-y-1.5">
              <Link
                href="/admin/riders"
                className="flex items-center gap-2.5 py-2 text-sm text-[#9ca3af] hover:text-white transition-colors"
              >
                <Users className="h-3.5 w-3.5 text-[#555]" />
                Riders
              </Link>
              <Link
                href="/admin/policies"
                className="flex items-center gap-2.5 py-2 text-sm text-[#9ca3af] hover:text-white transition-colors"
              >
                <FileCheck className="h-3.5 w-3.5 text-[#555]" />
                Policies
              </Link>
              <Link
                href="/admin/fraud"
                className="flex items-center gap-2.5 py-2 text-sm text-[#9ca3af] hover:text-white transition-colors"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-[#555]" />
                Fraud queue
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <AdminLiveFeed summary24h={summary24h} />
    </div>
  );
}
