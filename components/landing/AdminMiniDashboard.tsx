'use client';

import { BarChart2, TrendingUp } from 'lucide-react';
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

const NEON = {
  cyan: '#7dd3fc',
  violet: '#a78bfa',
  amber: '#f59e0b',
  emerald: '#22c55e',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#161616',
  border: '1px solid #2d2d2d',
  borderRadius: '10px',
  fontSize: '12px',
  color: '#9ca3af',
  boxShadow: '0 0 16px rgba(125, 211, 252, 0.08)',
} as const;

const TOOLTIP_LABEL_STYLE = { color: '#e4e4e7' } as const;
const TOOLTIP_ITEM_STYLE = { color: '#9ca3af' } as const;
const TOOLTIP_CURSOR = { fill: 'rgba(255, 255, 255, 0.02)' } as const;

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

const claimsTimeline = [
  { date: '2026-03-11', claims: 12, payout: 4200, flagged: 1 },
  { date: '2026-03-12', claims: 18, payout: 6900, flagged: 2 },
  { date: '2026-03-13', claims: 9, payout: 2800, flagged: 0 },
  { date: '2026-03-14', claims: 22, payout: 9100, flagged: 3 },
  { date: '2026-03-15', claims: 15, payout: 5400, flagged: 1 },
  { date: '2026-03-16', claims: 27, payout: 11800, flagged: 4 },
  { date: '2026-03-17', claims: 14, payout: 4600, flagged: 1 },
];

const premiumsTimeline = [
  { week: '2026-02-18', amount: 920 },
  { week: '2026-02-25', amount: 1040 },
  { week: '2026-03-04', amount: 1210 },
  { week: '2026-03-11', amount: 1389 },
];

const eventsTimeline = [
  { date: '2026-03-11', count: 1 },
  { date: '2026-03-12', count: 1 },
  { date: '2026-03-13', count: 1 },
  { date: '2026-03-14', count: 1 },
  { date: '2026-03-15', count: 1 },
  { date: '2026-03-16', count: 4 },
  { date: '2026-03-17', count: 1 },
];

const lossRatioTimeline = [
  { week: '2026-02-25', premium: 920, payout: 610, lossRatio: 66 },
  { week: '2026-03-04', premium: 1210, payout: 960, lossRatio: 79 },
  { week: '2026-03-11', premium: 1389, payout: 2271, lossRatio: 163 },
];

const triggers = [
  { type: 'weather', count: 42, label: 'Weather' },
  { type: 'traffic', count: 19, label: 'Traffic' },
  { type: 'social', count: 8, label: 'Social' },
];

const recent = [
  { id: 'CLM-1042', zone: 'Koramangala', amount: 500, when: 'Today' },
  { id: 'CLM-1039', zone: 'HSR Layout', amount: 650, when: 'Yesterday' },
  { id: 'CLM-1031', zone: 'Indiranagar', amount: 450, when: '2d ago' },
];

export function AdminMiniDashboard() {
  const summary = {
    totalClaims: 9,
    totalPayout: 2271,
    totalPremium: 1389,
    lossRatio: 163,
    flaggedClaims: 1,
    totalEvents: 11,
  };

  const flaggedPct =
    summary.totalClaims > 0 ? Math.round((summary.flaggedClaims / summary.totalClaims) * 100) : 0;

  const PIE_COLORS = [NEON.cyan, NEON.amber, NEON.violet];

  return (
    <div className="space-y-6">
      {/* Header — match `app/(admin)/admin/page.tsx` */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Overview</h1>
          <p className="text-sm text-[#666] mt-1">
            Claims, premiums, loss ratio, and triggers. Last 30 days
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-[#7dd3fc] px-3 py-2 text-xs font-semibold text-black hover:opacity-90"
        >
          Run Adjudicator
        </button>
      </div>

      {/* Summary strip — match `components/admin/AnalyticsCharts.tsx` */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Claims (30d)',
            value: summary.totalClaims,
            sub: `${summary.flaggedClaims} flagged`,
            color: 'text-white',
            accent: 'bg-[#262626] text-[#666666]',
          },
          {
            label: 'Payouts',
            value: formatINR(summary.totalPayout),
            sub: 'parametric',
            color: 'text-[#7dd3fc]',
            accent: 'bg-[#7dd3fc]/10 text-[#7dd3fc]',
          },
          {
            label: 'Premiums',
            value: formatINR(summary.totalPremium),
            sub: 'active policies',
            color: 'text-[#a78bfa]',
            accent: 'bg-[#a78bfa]/10 text-[#a78bfa]',
          },
          {
            label: 'Loss ratio',
            value: `${summary.lossRatio}%`,
            sub: summary.lossRatio > 80 ? 'Above threshold' : 'Within range',
            color: summary.lossRatio > 80 ? 'text-[#f59e0b]' : 'text-[#22c55e]',
            accent:
              summary.lossRatio > 80
                ? 'bg-[#f59e0b]/10 text-[#f59e0b]'
                : 'bg-[#22c55e]/10 text-[#22c55e]',
          },
          {
            label: 'Events',
            value: summary.totalEvents,
            sub: 'last 30 days',
            color: 'text-[#9ca3af]',
            accent: 'bg-[#262626] text-[#666666]',
          },
          {
            label: 'Flagged',
            value: `${flaggedPct}%`,
            sub: `${summary.flaggedClaims} of ${summary.totalClaims} claims`,
            color: summary.flaggedClaims > 0 ? 'text-[#f59e0b]' : 'text-[#22c55e]',
            accent:
              summary.flaggedClaims > 0
                ? 'bg-[#f59e0b]/10 text-[#f59e0b]'
                : 'bg-[#22c55e]/10 text-[#22c55e]',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-4 py-4 flex flex-col h-[104px]"
          >
            <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest leading-4 whitespace-nowrap truncate">
              {s.label}
            </p>
            <div className="flex-1 flex items-center">
              <p className={`text-xl font-bold tabular-nums leading-none ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Claims over time — same structure */}
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp className="h-4 w-4 text-[#7dd3fc]" />
          <p className="text-sm font-semibold text-white">Claims & Payouts</p>
          <span className="text-[10px] text-[#666666] ml-auto">Last 7 days</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={claimsTimeline} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="payoutGradMini" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={NEON.cyan} stopOpacity={0.18} />
                <stop offset="95%" stopColor={NEON.cyan} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="claimGradMini" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#payoutGradMini)"
              strokeWidth={1.5}
              dot={false}
            />
            <Area
              yAxisId="count"
              type="monotone"
              dataKey="claims"
              stroke={NEON.violet}
              fill="url(#claimGradMini)"
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
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
      </div>

      {/* Premiums by week (matches screenshot) */}
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <BarChart2 className="h-4 w-4 text-[#a78bfa]" />
          <p className="text-sm font-semibold text-white">Premiums by Week</p>
          <span className="text-[10px] text-[#666666] ml-auto">Last 30 days</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={premiumsTimeline} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="premiumGradMini" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={NEON.violet} stopOpacity={0.25} />
                <stop offset="95%" stopColor={NEON.violet} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
            <XAxis
              dataKey="week"
              tickFormatter={(v) => formatShortDate(String(v))}
              tick={{ fill: '#666666', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#666666', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={TOOLTIP_CURSOR}
              formatter={(value) => [formatINR(Number(value)), 'Premium']}
              labelFormatter={(v) => formatShortDate(String(v))}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={NEON.violet}
              fill="url(#premiumGradMini)"
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* API & system + 7-day outlook */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
          <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-3">API & system</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { name: 'Open-Meteo Weather', ok: true },
              { name: 'Open-Meteo AQI', ok: true },
              { name: 'Tomorrow.io', ok: true },
              { name: 'NewsData.io', ok: true },
              { name: 'OpenRouter LLM', ok: true },
              { name: 'Stripe', ok: true },
            ].map((api) => (
              <div
                key={api.name}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] px-3 py-2"
              >
                <span className="text-[11px] text-[#9ca3af] truncate">{api.name}</span>
                <span className="shrink-0 text-[10px] font-semibold text-[#22c55e]">OK</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-2 mt-3 border-t border-[#2d2d2d] text-[11px] text-[#666]">
            <span>Last run: 0 payouts · 0ms</span>
            <span>Errors (24h): 0</span>
          </div>
        </div>
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
          <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-3">7-day outlook</p>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg font-semibold capitalize text-[#22c55e]">low</span>
              <span className="text-xs text-[#555]">(0–1 expected claims)</span>
            </div>
            <p className="text-xs text-[#666] leading-relaxed">
              No disruption signals above thresholds. Continue monitoring your zones.
            </p>
          </div>
        </div>
      </div>

      {/* Disruption events by day */}
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp className="h-4 w-4 text-[#f59e0b]" />
          <p className="text-sm font-semibold text-white">Disruption events by day</p>
          <span className="text-[10px] text-[#666666] ml-auto">Last 7 days</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={eventsTimeline} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fill: '#666666', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: '#666666', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={TOOLTIP_CURSOR}
              formatter={(v) => [v, 'Events']}
              labelFormatter={(label) => formatShortDate(String(label))}
            />
            <Bar dataKey="count" fill={NEON.amber} radius={[3, 3, 0, 0]} maxBarSize={24} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Loss ratio + trigger breakdown (matches bottom row) */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <TrendingUp className="h-4 w-4 text-[#f59e0b]" />
            <p className="text-sm font-semibold text-white">Loss Ratio by Week</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={lossRatioTimeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
              <XAxis
                dataKey="week"
                tickFormatter={(v) => formatShortDate(String(v))}
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
              <Line type="monotone" dataKey={() => 80} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} dot={false} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-[#444] mt-2">Dashed line = 80% threshold</p>
        </div>

        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <BarChart2 className="h-4 w-4 text-[#666666]" />
            <p className="text-sm font-semibold text-white">Trigger Breakdown</p>
          </div>
          <div className="flex items-center justify-around">
            <ResponsiveContainer width="55%" height={180}>
              <BarChart data={triggers} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#666666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  cursor={TOOLTIP_CURSOR}
                  formatter={(v) => [v, 'Events']}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={18}>
                  {triggers.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="flex flex-col items-center gap-2">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={triggers} dataKey="count" cx="50%" cy="50%" innerRadius={32} outerRadius={52} strokeWidth={0}>
                    {triggers.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 text-center">
                {triggers.map((d, i) => (
                  <p key={d.type} className="text-[10px] text-[#666666] flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {d.label}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

