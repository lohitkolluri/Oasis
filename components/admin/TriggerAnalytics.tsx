'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, BarChart2 } from 'lucide-react';
import { ChartCard } from '@/components/ui/ChartCard';

type Event = {
  id: string;
  event_type: string;
  severity_score: number;
  created_at: string;
};

const NEON = {
  cyan: '#7dd3fc',
  violet: '#a78bfa',
  amber: '#f59e0b',
};

const TYPE_COLORS: Record<string, string> = {
  weather: NEON.cyan,
  traffic: NEON.amber,
  social: NEON.violet,
};

const TOOLTIP_STYLE = {
  backgroundColor: '#161616',
  border: '1px solid #2d2d2d',
  borderRadius: 10,
  fontSize: 11,
  color: '#9ca3af',
} as const;

const TOOLTIP_LABEL_STYLE = { color: '#e4e4e7' } as const;
const TOOLTIP_ITEM_STYLE = { color: '#9ca3af' } as const;

const TOOLTIP_CURSOR = { fill: 'rgba(255,255,255,0.02)' } as const;

export function TriggerAnalytics({ events }: { events: Event[] }) {
  if (!events || events.length === 0) return null;

  const total = events.length;

  const byTypeMap = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] ?? 0) + 1;
    return acc;
  }, {});

  const byType = Object.entries(byTypeMap).map(([type, count]) => ({
    type,
    label: type === 'weather' ? 'Weather' : type === 'traffic' ? 'Traffic' : 'Social',
    count,
  }));

  const severityBuckets = { low: 0, medium: 0, high: 0 };
  for (const e of events) {
    if (e.severity_score >= 8) severityBuckets.high++;
    else if (e.severity_score >= 5) severityBuckets.medium++;
    else severityBuckets.low++;
  }

  const severityData = [
    { name: 'High (8–10)', value: severityBuckets.high, color: NEON.amber },
    { name: 'Medium (5–7)', value: severityBuckets.medium, color: NEON.cyan },
    { name: 'Low (1–4)', value: severityBuckets.low, color: '#3f3f46' },
  ].filter((d) => d.value > 0);

  const byHourMap = events.reduce<Record<string, number>>((acc, e) => {
    const d = new Date(e.created_at);
    const label = `${d.getHours().toString().padStart(2, '0')}:00`;
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  const byHour = Object.entries(byHourMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }));

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr,1.5fr]">
      <ChartCard
        title="Events by type"
        subtitle={`${total} events (last 100) · where disruptions are coming from`}
        icon={BarChart2}
      >
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={byType}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: '#d4d4d8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={TOOLTIP_CURSOR}
                formatter={(value) => [value, 'Events']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {byType.map((row) => (
                  <Cell
                    key={row.type}
                    fill={TYPE_COLORS[row.type] ?? '#4b5563'}
                    opacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Severity & timing"
        subtitle="How intense and when triggers are hitting riders"
        icon={Activity}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-[140px] w-full sm:w-[140px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={56}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} opacity={0.95} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {severityData.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-zinc-400">{s.name}</span>
                </div>
                <span className="font-mono text-zinc-300 tabular-nums">{s.value}</span>
              </div>
            ))}
            {byHour.length > 0 && (
              <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800">
                Peak hour:{' '}
                <span className="text-zinc-100 font-mono">
                  {
                    byHour.reduce((max, cur) => (cur.count > max.count ? cur : max), byHour[0])
                      .hour
                  }
                </span>
                {' · '}
                {byHour.reduce((max, cur) => (cur.count > max.count ? cur : max), byHour[0])
                  .count}{' '}
                events
              </p>
            )}
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

