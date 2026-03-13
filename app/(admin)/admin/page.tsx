import { AdminInsights } from '@/components/admin/AdminInsights';
import { AdminLiveFeed } from '@/components/admin/AdminLiveFeed';
import { RunAdjudicatorButton } from '@/components/admin/RunAdjudicatorButton';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { KPICard } from '@/components/ui/KPICard';
import { getNextWeekPrediction } from '@/lib/ml/next-week-risk';
import { createAdminClient } from '@/lib/supabase/admin';
import { TrendingUp } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const [{ data: policies }, { data: claims }, { count: ridersCount }] = await Promise.all([
    supabase.from('weekly_policies').select('weekly_premium_inr, is_active').eq('is_active', true),
    supabase.from('parametric_claims').select('payout_amount_inr, is_flagged'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .or('role.eq.rider,role.is.null'),
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
          <p className="text-sm text-[#666] mt-1">
            Platform analytics and operational controls
            {reportsCount > 0 && (
              <span className="ml-2 text-[#7dd3fc]">
                {reportsCount} self-report{reportsCount !== 1 ? 's' : ''} in 24h
              </span>
            )}
          </p>
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
          {/* Next Week Prediction */}
          <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-[#7dd3fc]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Next Week</p>
                <p className="text-[10px] text-[#555]">
                  {nextWeekPrediction.source === 'forecast'
                    ? 'Tomorrow.io 5-day forecast'
                    : 'Historical claim data'}
                </p>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  nextWeekPrediction.riskLevel === 'high'
                    ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'
                    : nextWeekPrediction.riskLevel === 'medium'
                      ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                      : 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                }`}
              >
                {nextWeekPrediction.riskLevel}
              </span>
            </div>
            <p
              className={`text-4xl font-bold tabular-nums tracking-tight leading-none ${riskValueColor[nextWeekPrediction.riskLevel]}`}
            >
              {nextWeekPrediction.expectedClaimsRange}
            </p>
            <p className="text-xs text-[#666] mt-1.5">expected claims</p>
            {nextWeekPrediction.aqiRisk && (
              <p className="text-[10px] text-[#f59e0b] mt-2">{nextWeekPrediction.aqiRisk}</p>
            )}
            {nextWeekPrediction.details && (
              <p className="text-xs text-[#666] mt-4 leading-relaxed border-t border-[#2d2d2d] pt-4">
                {nextWeekPrediction.details}
              </p>
            )}
            {nextWeekPrediction.zonesChecked != null && (
              <p className="text-[10px] text-[#444] mt-2">
                {nextWeekPrediction.zonesChecked} active zone
                {nextWeekPrediction.zonesChecked !== 1 ? 's' : ''} ·{' '}
                {nextWeekPrediction.source === 'forecast'
                  ? 'Tomorrow.io + Open-Meteo AQI'
                  : '21-day rolling average'}
              </p>
            )}
          </div>

          <SystemHealth />
        </div>
      </div>

      {/* Live Feed */}
      <AdminLiveFeed />
    </div>
  );
}
