'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type ForecastTier = {
  key: string; // slug-like
  label: string;
  color: string;
};

export type PricingPoint = {
  weekStartDate: string; // YYYY-MM-DD
  isForecast?: boolean;
  // dynamic keys: `${tier.key}Actual` and `${tier.key}Pred`
  [key: string]: string | number | boolean | null | undefined;
};

const TOOLTIP_STYLE = {
  backgroundColor: '#161616',
  border: '1px solid #2d2d2d',
  borderRadius: 10,
  fontSize: 11,
  color: '#9ca3af',
  boxShadow: '0 0 16px rgba(255,255,255,0.04)',
};

const TOOLTIP_CURSOR = { fill: 'rgba(255, 255, 255, 0.02)' };

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

interface PlanPricingForecastChartProps {
  tiers: ForecastTier[];
  points: PricingPoint[];
  caption?: string | null;
}

export function PlanPricingForecastChart({
  tiers,
  points,
  caption,
}: PlanPricingForecastChartProps) {
  if (!points || points.length === 0) {
    return (
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
        <p className="text-sm font-semibold text-white">Next week forecast</p>
        <p className="mt-2 text-[11px] text-[#555]">
          No pricing history yet. Once snapshots exist, a forecast overlay will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Next week forecast</p>
          <p className="text-[11px] text-[#666] mt-1">
            Solid = historical snapshots · Dashed = predicted next week
          </p>
        </div>
        {caption && (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#9ca3af] tabular-nums">
            {caption}
          </span>
        )}
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
            <XAxis
              dataKey="weekStartDate"
              tickFormatter={formatShortDate}
              tick={{ fill: '#666666', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#666666', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={TOOLTIP_CURSOR}
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value, name) => {
                const n = Number(value);
                if (!Number.isFinite(n)) return [String(value), String(name)];
                const label = String(name).toLowerCase().includes('pred')
                  ? 'Predicted'
                  : 'Actual';
                return [formatINR(n), label];
              }}
            />

            {tiers.map((t) => (
              <Line
                key={`${t.key}:actual`}
                type="monotone"
                dataKey={`${t.key}Actual`}
                stroke={t.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}

            {tiers.map((t) => (
              <Line
                key={`${t.key}:pred`}
                type="monotone"
                dataKey={`${t.key}Pred`}
                stroke={t.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                opacity={0.9}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#2d2d2d]">
        {tiers.map((t) => (
          <div key={t.key} className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-6 rounded-full" style={{ background: t.color }} />
            <span className="text-[10px] text-[#666]">{t.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="inline-block h-px w-6 bg-white/40" style={{ borderTop: '1px dashed rgba(255,255,255,0.5)' }} />
          <span className="text-[10px] text-[#666]">Forecast</span>
        </div>
      </div>
    </div>
  );
}

