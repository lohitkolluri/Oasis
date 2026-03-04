"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart2, Loader2 } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalClaims: number;
    totalPayout: number;
    totalPremium: number;
    lossRatio: number;
    flaggedClaims: number;
    totalEvents: number;
  };
  claimsTimeline: Array<{ date: string; claims: number; payout: number; flagged: number }>;
  premiumsTimeline: Array<{ week: string; amount: number }>;
  lossRatioTimeline: Array<{ week: string; premium: number; payout: number; lossRatio: number }>;
  triggerBreakdown: Array<{ type: string; count: number }>;
  severityBuckets: { low: number; medium: number; high: number };
}

const CHART_COLORS = {
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  violet: "#8b5cf6",
  blue: "#3b82f6",
  zinc: "#52525b",
};

const PIE_COLORS = [CHART_COLORS.blue, CHART_COLORS.amber, CHART_COLORS.violet];

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

const CustomTooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#d4d4d8",
};

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-10 text-center">
        <p className="text-sm text-zinc-600">{error ?? "No data available"}</p>
      </div>
    );
  }

  const { summary, claimsTimeline, lossRatioTimeline, triggerBreakdown, severityBuckets } = data;

  const severityData = [
    { name: "Low (1–4)", value: severityBuckets.low },
    { name: "Medium (5–7)", value: severityBuckets.medium },
    { name: "High (8–10)", value: severityBuckets.high },
  ].filter((d) => d.value > 0);

  const triggerData = triggerBreakdown.map((t) => ({
    ...t,
    label: t.type === "weather" ? "Weather" : t.type === "traffic" ? "Traffic" : "Social",
  }));

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total Claims (30d)",
            value: summary.totalClaims,
            sub: `${summary.flaggedClaims} flagged`,
            color: "text-zinc-100",
          },
          {
            label: "Total Payouts",
            value: formatINR(summary.totalPayout),
            sub: "parametric",
            color: "text-emerald-400",
          },
          {
            label: "Premiums Collected",
            value: formatINR(summary.totalPremium),
            sub: "active policies",
            color: "text-violet-400",
          },
          {
            label: "Loss Ratio",
            value: `${summary.lossRatio}%`,
            sub: summary.lossRatio > 80 ? "Above threshold" : "Within range",
            color: summary.lossRatio > 80 ? "text-amber-400" : "text-emerald-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4"
          >
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              {s.label}
            </p>
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Claims over time */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-3.5 w-3.5 text-zinc-600" />
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
            Claims & Payouts — Last 30 Days
          </span>
        </div>
        {claimsTimeline.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">No claims data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={claimsTimeline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="claimGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.violet} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fill: "#52525b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="payout"
                orientation="right"
                tick={{ fill: "#52525b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <YAxis
                yAxisId="count"
                tick={{ fill: "#52525b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={CustomTooltipStyle}
                formatter={(value, name) =>
                  name === "payout" ? [formatINR(Number(value)), "Payout"] : [value, "Claims"]
                }
                labelFormatter={(label) => formatShortDate(String(label))}
              />
              <Area
                yAxisId="payout"
                type="monotone"
                dataKey="payout"
                stroke={CHART_COLORS.emerald}
                fill="url(#payoutGrad)"
                strokeWidth={1.5}
                dot={false}
              />
              <Area
                yAxisId="count"
                type="monotone"
                dataKey="claims"
                stroke={CHART_COLORS.violet}
                fill="url(#claimGrad)"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Loss ratio + trigger breakdown row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Loss ratio over weeks */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-5">
            {summary.lossRatio > 80 ? (
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Loss Ratio by Week
            </span>
          </div>
          {lossRatioTimeline.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">No weekly data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={lossRatioTimeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickFormatter={(v) => formatShortDate(v)}
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={CustomTooltipStyle}
                  formatter={(value, name) => {
                    if (name === "lossRatio") return [`${value}%`, "Loss Ratio"];
                    if (name === "premium") return [formatINR(Number(value)), "Premium"];
                    if (name === "payout") return [formatINR(Number(value)), "Payout"];
                    return [value, name];
                  }}
                  labelFormatter={(v) => formatShortDate(String(v))}
                />
                <Bar
                  dataKey="lossRatio"
                  fill={CHART_COLORS.amber}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={40}
                />
                {/* 80% threshold line */}
                <Line
                  type="monotone"
                  dataKey={() => 80}
                  stroke={CHART_COLORS.red}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          <p className="text-[10px] text-zinc-700 mt-2">Red line = 80% threshold</p>
        </div>

        {/* Trigger type breakdown */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="h-3.5 w-3.5 text-zinc-600" />
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Trigger Type Breakdown
            </span>
          </div>
          {triggerData.length === 0 && severityData.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">No events yet</p>
          ) : (
            <div className="flex items-center justify-around">
              {/* Trigger types bar */}
              {triggerData.length > 0 && (
                <ResponsiveContainer width="55%" height={180}>
                  <BarChart
                    data={triggerData}
                    layout="vertical"
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#52525b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={CustomTooltipStyle}
                      formatter={(v) => [v, "Events"]}
                    />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={18}>
                      {triggerData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Severity donut */}
              {severityData.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {severityData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              i === 0
                                ? CHART_COLORS.emerald
                                : i === 1
                                ? CHART_COLORS.amber
                                : CHART_COLORS.red
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CustomTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-0.5 text-center">
                    {severityData.map((d, i) => (
                      <p key={i} className="text-[10px] text-zinc-500">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1"
                          style={{
                            background:
                              i === 0
                                ? CHART_COLORS.emerald
                                : i === 1
                                ? CHART_COLORS.amber
                                : CHART_COLORS.red,
                          }}
                        />
                        {d.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
