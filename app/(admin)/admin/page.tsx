import { AdminInsights } from '@/components/admin/AdminInsights';
import { RunAdjudicatorButton } from '@/components/admin/RunAdjudicatorButton';
import { StatCard } from '@/components/admin/StatCard';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { getNextWeekPrediction } from '@/lib/ml/next-week-risk';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  Activity,
  BarChart2,
  ChevronRight,
  FileCheck,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

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
  } catch { /* Table may not exist */ }

  const totalPremiums = policies?.reduce((sum, p) => sum + Number(p.weekly_premium_inr), 0) ?? 0;
  const totalPayouts = claims?.reduce((sum, c) => sum + Number(c.payout_amount_inr), 0) ?? 0;
  const flaggedCount = claims?.filter((c) => c.is_flagged).length ?? 0;
  const lossRatio = totalPremiums > 0 ? ((totalPayouts / totalPremiums) * 100).toFixed(1) : '0';
  const activePoliciesCount = policies?.length ?? 0;

  const nextWeekPrediction = await getNextWeekPrediction(supabase);
  const riskValueColor = {
    low: 'text-[#22c55e]',
    medium: 'text-[#f59e0b]',
    high: 'text-[#ef4444]',
  };

  const quickLinks = [
    {
      href: '/admin/analytics',
      label: 'Analytics',
      description: 'Charts · loss ratio · trends',
      icon: BarChart2,
      alert: false,
      meta: null,
      accentColor: '#7dd3fc',
    },
    {
      href: '/admin/riders',
      label: 'Riders',
      description: 'Registered delivery partners',
      icon: Users,
      alert: false,
      meta: `${ridersCount ?? 0}`,
      accentColor: '#a78bfa',
    },
    {
      href: '/admin/policies',
      label: 'Policies',
      description: 'Active weekly coverage',
      icon: FileCheck,
      alert: false,
      meta: `${activePoliciesCount}`,
      accentColor: '#7dd3fc',
    },
    {
      href: '/admin/triggers',
      label: 'Live Triggers',
      description: 'Weather · traffic · social',
      icon: Zap,
      alert: false,
      meta: null,
      accentColor: '#a78bfa',
    },
    {
      href: '/admin/fraud',
      label: 'Fraud Queue',
      description: 'Flagged claims for review',
      icon: ShieldAlert,
      alert: flaggedCount > 0,
      meta: flaggedCount > 0 ? `${flaggedCount}` : null,
      accentColor: flaggedCount > 0 ? '#ef4444' : '#7dd3fc',
    },
    {
      href: '/admin/health',
      label: 'System Health',
      description: 'API status · run logs',
      icon: Activity,
      alert: false,
      meta: null,
      accentColor: '#22c55e',
    },
  ];

  return (
    <div className="space-y-10 py-2">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.15em] mb-1">Dashboard</p>
          <h1 className="text-3xl font-semibold font-display tracking-tight text-white">Overview</h1>
          <p className="text-sm text-[#666666] mt-1">Platform analytics and operational controls</p>
        </div>
        {reportsCount > 0 && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20">
            {reportsCount} self-report{reportsCount !== 1 ? 's' : ''} · 24h
          </span>
        )}
      </div>

      {/* KPI row */}
      <section>
        <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.12em] mb-4">Key Metrics</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Weekly Premiums"
            value={`₹${totalPremiums.toLocaleString('en-IN')}`}
            icon="TrendingUp"
            accent="cyan"
            delay={0}
          />
          <StatCard
            label="Active Riders"
            value={ridersCount ?? 0}
            icon="Users"
            accent="violet"
            delay={0.05}
          />
          <StatCard
            label="Policies Active"
            value={activePoliciesCount}
            icon="FileCheck"
            accent="default"
            delay={0.1}
          />
          <StatCard
            label="Loss Ratio"
            value={`${lossRatio}%`}
            icon="TrendingUp"
            accent={Number(lossRatio) > 80 ? 'amber' : 'default'}
            delay={0.15}
            subtext={Number(lossRatio) > 80 ? 'Above threshold' : 'Within range'}
          />
        </div>
      </section>

      {/* Adjudicator control */}
      <RunAdjudicatorButton />

      {/* Intelligence section */}
      <section>
        <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.12em] mb-4">Intelligence</p>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <AdminInsights />
          </div>
          <div className="space-y-4">
            {/* Next week forecast */}
            <div className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl p-5 shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:border-[#3a3a3a] transition-all">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-[#7dd3fc]" />
                </div>
                <div>
                  <p className="text-sm font-semibold font-display text-white">Next Week</p>
                  <p className="text-[10px] text-[#666666]">
                    {nextWeekPrediction.source === 'forecast' ? 'Weather forecast' : 'Historical data'}
                  </p>
                </div>
              </div>
              <p className={`text-4xl font-bold font-display tabular-nums tracking-tight leading-none ${riskValueColor[nextWeekPrediction.riskLevel]}`}>
                {nextWeekPrediction.expectedClaimsRange}
              </p>
              <p className="text-xs text-[#666666] mt-1.5">expected claims</p>
              {nextWeekPrediction.details && (
                <p className="text-xs text-[#666666] mt-4 leading-relaxed border-t border-[#2d2d2d] pt-4">
                  {nextWeekPrediction.details}
                </p>
              )}
            </div>

            <SystemHealth />
          </div>
        </div>
      </section>

      {/* Quick links grid */}
      <section>
        <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.12em] mb-4">Sections</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map(({ href, label, description, icon: Icon, alert, meta, accentColor }, i) => (
            <Link
              key={href}
              href={href}
              className="group bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl p-5 shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:border-[#3a3a3a] hover:shadow-[0_0_22px_rgba(125,211,252,0.1)] transition-all duration-200 flex flex-col gap-4"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: alert ? 'rgba(239, 68, 68, 0.1)' : `${accentColor}14`,
                    border: `1px solid ${alert ? 'rgba(239, 68, 68, 0.2)' : `${accentColor}28`}`,
                  }}
                >
                  <Icon
                    className="h-4 w-4 transition-colors"
                    style={{ color: alert ? '#ef4444' : accentColor }}
                  />
                </div>
                {meta && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: alert ? 'rgba(239, 68, 68, 0.1)' : `${accentColor}14`,
                      color: alert ? '#ef4444' : accentColor,
                    }}
                  >
                    {meta}
                  </span>
                )}
              </div>
              <div>
                <p className={`text-sm font-semibold ${alert ? 'text-[#ef4444]' : 'text-white'} group-hover:text-white transition-colors`}>
                  {label}
                </p>
                <p className="text-xs text-[#666666] mt-0.5">{description}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#3a3a3a] group-hover:text-[#666666] group-hover:translate-x-0.5 transition-all mt-auto self-end" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
