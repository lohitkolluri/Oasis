'use client';

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

interface Prediction {
  riskLevel: 'low' | 'medium' | 'high';
  expectedClaimsRange: string;
  details?: string;
  aqiRisk?: string;
  source?: string;
  zonesChecked?: number;
}

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
  eventsTimeline?: Array<{ date: string; count: number }>;
  triggerBreakdown: Array<{ type: string; count: number }>;
  severityBuckets: { low: number; medium: number; high: number };
  prediction?: Prediction | null;
}

interface HealthApi {
  name: string;
  ok: boolean;
  status: number;
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
  const [health, setHealth] = useState<{
    apis: HealthApi[];
    status: string;
    lastAdjudicatorRun: { at: string; claimsCreated: number; durationMs: number } | null;
    errors24h: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsResp, healthResp] = await Promise.all([
          fetch('/api/admin/analytics', { signal: controller.signal, cache: 'no-store' }),
          fetch('/api/admin/system-health', { signal: controller.signal, cache: 'no-store' }),
        ]);

        if (!active) return;

        const analyticsJson = await analyticsResp.json();
        if (!active) return;

        if (!analyticsResp.ok) {
          throw new Error(
            analyticsJson?.error ?? `Analytics request failed (${analyticsResp.status})`,
          );
        }
        if (analyticsJson.error) throw new Error(analyticsJson.error);
        setData(analyticsJson);

        const healthJson = await healthResp.json().catch(() => null);
        if (!active) return;

        if (healthJson?.apis) {
          setHealth({
            apis: healthJson.apis,
            status: healthJson.status ?? 'unknown',
            lastAdjudicatorRun: healthJson.lastAdjudicatorRun
              ? {
                  at: healthJson.lastAdjudicatorRun.at,
                  claimsCreated: healthJson.lastAdjudicatorRun.claimsCreated ?? 0,
                  durationMs: healthJson.lastAdjudicatorRun.durationMs ?? 0,
                }
              : null,
            errors24h: healthJson.errors24h ?? 0,
          });
        } else {
          setHealth(null);
        }
      } catch (e) {
        if (!active) return;
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message || 'Failed to load analytics');
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
      controller.abort();
    };
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
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-5 py-10 text-center">
        <p className="text-sm text-[#555]">{error ?? 'No data available'}</p>
      </div>
    );
  }

  const {
    summary,
    claimsTimeline,
    lossRatioTimeline,
    triggerBreakdown,
    severityBuckets,
    eventsTimeline = [],
  } = data;

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

  const flaggedPct =
    summary.totalClaims > 0
      ? Math.round((summary.flaggedClaims / summary.totalClaims) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Total Claims (30d)',
            value: summary.totalClaims,
            sub: `${summary.flaggedClaims} flagged`,
            color: 'text-white',
            accent: 'bg-[#262626] text-[#666666]',
          },
          {
            label: 'Total Payouts',
            value: formatINR(summary.totalPayout),
            sub: 'parametric',
            color: 'text-[#7dd3fc]',
            accent: 'bg-[#7dd3fc]/10 text-[#7dd3fc]',
          },
          {
            label: 'Premiums Collected',
            value: formatINR(summary.totalPremium),
            sub: 'paid / demo policies in range',
            color: 'text-[#a78bfa]',
            accent: 'bg-[#a78bfa]/10 text-[#a78bfa]',
          },
          {
            label: 'Loss Ratio',
            value: `${summary.lossRatio}%`,
            sub: summary.lossRatio > 80 ? 'Above threshold' : 'Within range',
            color: summary.lossRatio > 80 ? 'text-[#f59e0b]' : 'text-[#22c55e]',
            accent: summary.lossRatio > 80 ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-[#22c55e]/10 text-[#22c55e]',
          },
          {
            label: 'Trigger Events',
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
            accent: summary.flaggedClaims > 0 ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-[#22c55e]/10 text-[#22c55e]',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-4 py-4 h-[104px] flex flex-col items-center text-center"
          >
            <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest whitespace-nowrap truncate w-full">
              {s.label}
            </p>
            <div className="flex-1 flex items-center">
              <p className={`text-xl font-bold tabular-nums leading-none ${s.color}`}>{s.value}</p>
            </div>
            <span
              className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${s.accent}`}
            >
              {s.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Claims over time */}
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
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
      </div>

      {/* Premiums over time */}
      {data.premiumsTimeline && data.premiumsTimeline.length > 0 && (
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <BarChart2 className="h-4 w-4 text-[#a78bfa]" />
            <p className="text-sm font-semibold text-white">Premiums by Week</p>
            <span className="text-[10px] text-[#666666] ml-auto">Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={data.premiumsTimeline}
              margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NEON.violet} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={NEON.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
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
                fill="url(#premiumGrad)"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* API status cards + 7-day outlook */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* API & system cards */}
        <div className="lg:col-span-2 bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
          <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-3">
            API & system
          </p>
          {health ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {health.apis.map((api) => (
                  <div
                    key={api.name}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] px-3 py-2"
                  >
                    <span className="text-[11px] text-[#9ca3af] truncate">{api.name}</span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold ${
                        api.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'
                      }`}
                    >
                      {api.ok ? 'OK' : 'DOWN'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-[#2d2d2d] text-[11px] text-[#666]">
                {health.lastAdjudicatorRun && (
                  <span>
                    Last run: {health.lastAdjudicatorRun.claimsCreated} payouts ·{' '}
                    {health.lastAdjudicatorRun.durationMs}ms
                  </span>
                )}
                {health.errors24h > 0 && (
                  <span className="text-[#f59e0b]">{health.errors24h} errors (24h)</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#555]">Loading system status…</p>
          )}
        </div>

        {/* 7-day outlook */}
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
          <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-3">
            7-day outlook
          </p>
          {data.prediction ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className={`text-lg font-semibold capitalize ${
                    data.prediction.riskLevel === 'high'
                      ? 'text-[#ef4444]'
                      : data.prediction.riskLevel === 'medium'
                        ? 'text-[#f59e0b]'
                        : 'text-[#22c55e]'
                  }`}
                >
                  {data.prediction.riskLevel}
                </span>
                <span className="text-xs text-[#555]">
                  ({data.prediction.expectedClaimsRange} expected claims)
                </span>
              </div>
              {data.prediction.details && (
                <p className="text-xs text-[#666] leading-relaxed">{data.prediction.details}</p>
              )}
              {data.prediction.aqiRisk && (
                <p className="text-[11px] text-[#f59e0b]">{data.prediction.aqiRisk}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#555]">No forecast data</p>
          )}
        </div>
      </div>

      {/* Events over time */}
      {eventsTimeline.length > 0 && (
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <TrendingUp className="h-4 w-4 text-[#f59e0b]" />
            <p className="text-sm font-semibold text-white">Disruption events by day</p>
            <span className="text-[10px] text-[#666666] ml-auto">Last 30 days</span>
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
              <YAxis
                tick={{ fill: '#666666', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={TOOLTIP_CURSOR}
                formatter={(v) => [v, 'Events']}
                labelFormatter={(label) => formatShortDate(String(label))}
              />
              <Bar
                dataKey="count"
                fill={NEON.amber}
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Loss ratio + trigger breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Loss ratio */}
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
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
          <p className="text-[10px] text-[#444] mt-2">Dashed line = 80% threshold</p>
        </div>

        {/* Trigger breakdown */}
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
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
        </div>
      </div>
    </div>
  );
}
