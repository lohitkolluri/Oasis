'use client';

import { motion } from 'framer-motion';
import { BarChart2, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

const NEON = {
  cyan: '#7dd3fc',
  violet: '#a78bfa',
  amber: '#f59e0b',
  red: '#ef4444',
  emerald: '#22c55e',
  muted: '#3a3a3a',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#161616',
  border: '1px solid #2d2d2d',
  borderRadius: '10px',
  fontSize: '12px',
  color: '#9ca3af',
  boxShadow: '0 0 16px rgba(125, 211, 252, 0.08)',
};

const TOOLTIP_LABEL_STYLE = { color: '#e4e4e7' };
const TOOLTIP_ITEM_STYLE = { color: '#9ca3af' };

const TOOLTIP_CURSOR = { fill: 'rgba(255, 255, 255, 0.02)' };

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/analytics')
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
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#7dd3fc]" />
          <p className="text-xs text-[#666666]">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl px-5 py-10 text-center">
        <p className="text-sm text-[#666666]">{error ?? 'No data available'}</p>
      </div>
    );
  }

  const { summary, claimsTimeline, lossRatioTimeline, triggerBreakdown, severityBuckets } = data;

  const severityData = [
    { name: 'Low (1–4)', value: severityBuckets.low },
    { name: 'Medium (5–7)', value: severityBuckets.medium },
    { name: 'High (8–10)', value: severityBuckets.high },
  ].filter((d) => d.value > 0);

  const triggerData = triggerBreakdown.map((t) => ({
    ...t,
    label: t.type === 'weather' ? 'Weather' : t.type === 'traffic' ? 'Traffic' : 'Social',
  }));

  const PIE_COLORS = [NEON.cyan, NEON.amber, NEON.violet];

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Claims (30d)',
            value: summary.totalClaims,
            sub: `${summary.flaggedClaims} flagged`,
            color: 'text-white',
            accent: 'bg-[#262626] text-[#666666]',
            delay: 0,
          },
          {
            label: 'Total Payouts',
            value: formatINR(summary.totalPayout),
            sub: 'parametric',
            color: 'text-[#7dd3fc]',
            accent: 'bg-[#7dd3fc]/10 text-[#7dd3fc]',
            delay: 0.05,
          },
          {
            label: 'Premiums Collected',
            value: formatINR(summary.totalPremium),
            sub: 'active policies',
            color: 'text-[#a78bfa]',
            accent: 'bg-[#a78bfa]/10 text-[#a78bfa]',
            delay: 0.1,
          },
          {
            label: 'Loss Ratio',
            value: `${summary.lossRatio}%`,
            sub: summary.lossRatio > 80 ? 'Above threshold' : 'Within range',
            color: summary.lossRatio > 80 ? 'text-[#f59e0b]' : 'text-[#22c55e]',
            accent: summary.lossRatio > 80 ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-[#22c55e]/10 text-[#22c55e]',
            delay: 0.15,
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: s.delay }}
            className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-4 py-4 hover:border-[#3a3a3a] transition-colors"
          >
            <p className="text-[10px] font-semibold text-[#666666] uppercase tracking-widest mb-2">
              {s.label}
            </p>
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <span className={`inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${s.accent}`}>
              {s.sub}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Claims over time */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl p-5 shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:border-[#3a3a3a] transition-all"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp className="h-4 w-4 text-[#7dd3fc]" />
          <p className="text-sm font-semibold text-white">Claims & Payouts</p>
          <span className="text-[10px] text-[#666666] ml-auto">Last 30 days</span>
        </div>
        {claimsTimeline.length === 0 ? (
          <p className="text-sm text-[#666666] text-center py-8">No claims data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={claimsTimeline} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NEON.cyan} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={NEON.cyan} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="claimGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NEON.violet} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={NEON.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fill: '#666666', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="payout"
                orientation="right"
                tick={{ fill: '#666666', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <YAxis
                yAxisId="count"
                tick={{ fill: '#666666', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={TOOLTIP_CURSOR}
                formatter={(value, name) =>
                  name === 'payout' ? [formatINR(Number(value)), 'Payout'] : [value, 'Claims']
                }
                labelFormatter={(label) => formatShortDate(String(label))}
              />
              <Area
                yAxisId="payout"
                type="monotone"
                dataKey="payout"
                stroke={NEON.cyan}
                fill="url(#payoutGrad)"
                strokeWidth={1.5}
                dot={false}
              />
              <Area
                yAxisId="count"
                type="monotone"
                dataKey="claims"
                stroke={NEON.violet}
                fill="url(#claimGrad)"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2d2d2d]">
          <div className="flex items-center gap-1.5">
            <span className="h-px w-6 bg-[#7dd3fc] inline-block" />
            <span className="text-[10px] text-[#666666]">Payouts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-px w-6 bg-[#a78bfa] inline-block" />
            <span className="text-[10px] text-[#666666]">Claims</span>
          </div>
        </div>
      </motion.div>

      {/* Loss ratio + trigger breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Loss ratio */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl p-5 shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:border-[#3a3a3a] transition-all"
        >
          <div className="flex items-center gap-2.5 mb-5">
            {summary.lossRatio > 80 ? (
              <TrendingUp className="h-4 w-4 text-[#f59e0b]" />
            ) : (
              <TrendingDown className="h-4 w-4 text-[#22c55e]" />
            )}
            <p className="text-sm font-semibold text-white">Loss Ratio by Week</p>
          </div>
          {lossRatioTimeline.length === 0 ? (
            <p className="text-sm text-[#666666] text-center py-8">No weekly data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={lossRatioTimeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickFormatter={(v) => formatShortDate(v)}
                  tick={{ fill: '#666666', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#666666', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  cursor={TOOLTIP_CURSOR}
                  formatter={(value, name) => {
                    if (name === 'lossRatio') return [`${value}%`, 'Loss Ratio'];
                    if (name === 'premium') return [formatINR(Number(value)), 'Premium'];
                    if (name === 'payout') return [formatINR(Number(value)), 'Payout'];
                    return [value, name];
                  }}
                  labelFormatter={(v) => formatShortDate(String(v))}
                />
                <Bar dataKey="lossRatio" fill={NEON.amber} radius={[3, 3, 0, 0]} maxBarSize={36} opacity={0.85} />
                <Line
                  type="monotone"
                  dataKey={() => 80}
                  stroke={NEON.red}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          <p className="text-[10px] text-[#3a3a3a] mt-2">Dashed line = 80% threshold</p>
        </motion.div>

        {/* Trigger breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl p-5 shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:border-[#3a3a3a] transition-all"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <BarChart2 className="h-4 w-4 text-[#666666]" />
            <p className="text-sm font-semibold text-white">Trigger Breakdown</p>
          </div>
          {triggerData.length === 0 && severityData.length === 0 ? (
            <p className="text-sm text-[#666666] text-center py-8">No events yet</p>
          ) : (
            <div className="flex items-center justify-around">
              {triggerData.length > 0 && (
                <ResponsiveContainer width="55%" height={180}>
                  <BarChart data={triggerData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#666666', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} cursor={TOOLTIP_CURSOR} formatter={(v) => [v, 'Events']} />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={18}>
                      {triggerData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {severityData.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={52}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {severityData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={i === 0 ? NEON.cyan : i === 1 ? NEON.amber : NEON.violet}
                            opacity={0.85}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 text-center">
                    {severityData.map((d, i) => (
                      <p key={i} className="text-[10px] text-[#666666] flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ background: i === 0 ? NEON.cyan : i === 1 ? NEON.amber : NEON.violet }}
                        />
                        {d.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
