import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { RunAdjudicatorButton } from "@/components/admin/RunAdjudicatorButton";
import { DemoTriggerButton } from "@/components/admin/DemoTriggerButton";
import { AdminInsights } from "@/components/admin/AdminInsights";
import { StatCard } from "@/components/admin/StatCard";
import { SystemHealth } from "@/components/admin/SystemHealth";
import { getNextWeekPrediction } from "@/lib/ml/next-week-risk";
import {
  TrendingUp,
  ChevronRight,
  Users,
  FileCheck,
  Zap,
  ShieldAlert,
  BarChart2,
  Activity,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const [{ data: policies }, { data: claims }, { count: ridersCount }] =
    await Promise.all([
      supabase.from("weekly_policies").select("weekly_premium_inr, is_active").eq("is_active", true),
      supabase.from("parametric_claims").select("payout_amount_inr, is_flagged"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

  let reportsCount = 0;
  try {
    const { count } = await supabase
      .from("rider_delivery_reports")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    reportsCount = count ?? 0;
  } catch {
    // Table may not exist
  }

  const totalPremiums = policies?.reduce((sum, p) => sum + Number(p.weekly_premium_inr), 0) ?? 0;
  const totalPayouts = claims?.reduce((sum, c) => sum + Number(c.payout_amount_inr), 0) ?? 0;
  const flaggedCount = claims?.filter((c) => c.is_flagged).length ?? 0;
  const lossRatio = totalPremiums > 0 ? ((totalPayouts / totalPremiums) * 100).toFixed(1) : "0";
  const activePoliciesCount = policies?.filter((p) => p.is_active).length ?? 0;

  const nextWeekPrediction = await getNextWeekPrediction(supabase);
  const riskColors = {
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-red-400",
  };

  const quickLinks = [
    {
      href: "/admin/analytics",
      label: "Analytics",
      description: "Charts · loss ratio · trends",
      icon: BarChart2,
      alert: false,
    },
    {
      href: "/admin/riders",
      label: "Riders",
      description: `${ridersCount ?? 0} registered`,
      icon: Users,
      alert: false,
    },
    {
      href: "/admin/policies",
      label: "Policies",
      description: `${activePoliciesCount} active`,
      icon: FileCheck,
      alert: false,
    },
    {
      href: "/admin/triggers",
      label: "Live Triggers",
      description: "Weather · traffic · social",
      icon: Zap,
      alert: false,
    },
    {
      href: "/admin/fraud",
      label: "Fraud Queue",
      description: `${flaggedCount} flagged`,
      icon: ShieldAlert,
      alert: flaggedCount > 0,
    },
    {
      href: "/admin/health",
      label: "System Health",
      description: "API status · run logs",
      icon: Activity,
      alert: false,
    },
  ];

  return (
    <div className="space-y-8 py-2">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Overview</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Platform analytics and operational controls</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Weekly Premiums"
          value={`₹${totalPremiums.toLocaleString("en-IN")}`}
          icon="TrendingUp"
          accent="default"
          delay={0}
        />
        <StatCard
          label="Total Payouts"
          value={`₹${totalPayouts.toLocaleString("en-IN")}`}
          icon="Cloud"
          accent="emerald"
          delay={0.04}
        />
        <StatCard
          label="Loss Ratio"
          value={`${lossRatio}%`}
          icon="TrendingUp"
          accent={Number(lossRatio) > 80 ? "amber" : "default"}
          delay={0.08}
          subtext={Number(lossRatio) > 80 ? "Above threshold" : "Within range"}
        />
        <StatCard
          label="Flagged Claims"
          value={flaggedCount}
          icon="ShieldAlert"
          accent={flaggedCount > 0 ? "red" : "default"}
          delay={0.12}
          subtext={flaggedCount > 0 ? "Needs review" : "All clear"}
        />
      </div>

      {/* Adjudicator + Demo controls */}
      <div className="grid md:grid-cols-2 gap-4">
        <RunAdjudicatorButton />
        <DemoTriggerButton />
      </div>

      {/* Insights + Prediction + Health */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdminInsights />
        </div>
        <div className="space-y-4">
          {/* Next week forecast */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-3.5 w-3.5 text-zinc-700" />
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                Next Week Forecast
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 mb-3">
              {nextWeekPrediction.source === "forecast"
                ? "Based on weather forecast"
                : "Based on historical data"}
            </p>
            <p className="text-3xl font-bold tabular-nums tracking-tight leading-none">
              <span className={riskColors[nextWeekPrediction.riskLevel]}>
                {nextWeekPrediction.expectedClaimsRange}
              </span>
            </p>
            <p className="text-sm text-zinc-500 mt-1.5">expected claims</p>
            {nextWeekPrediction.details && (
              <p className="text-xs text-zinc-600 mt-4 leading-relaxed border-t border-zinc-800 pt-4">
                {nextWeekPrediction.details}
              </p>
            )}
          </div>
          {/* System health inline */}
          <SystemHealth />
        </div>
      </div>

      {/* Quick links */}
      <div>
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Sections
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
          {quickLinks.map(({ href, label, description, icon: Icon, alert }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/50 transition-colors group"
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  alert ? "text-red-400" : "text-zinc-600 group-hover:text-zinc-400"
                } transition-colors`}
              />
              <span className="text-sm font-medium text-zinc-300 flex-1">{label}</span>
              <span className={`text-xs ${alert ? "text-red-400" : "text-zinc-500"}`}>
                {description}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
            </Link>
          ))}
          <div className="flex items-center gap-4 px-5 py-3.5">
            <ShieldAlert className="h-4 w-4 text-zinc-600 shrink-0" />
            <span className="text-sm font-medium text-zinc-300 flex-1">Self-Reports</span>
            <span className="text-xs text-zinc-500">{reportsCount} in last 24h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
