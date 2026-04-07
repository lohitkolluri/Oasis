'use client';

import { GeneratePremiumForecastButton } from '@/components/admin/GeneratePremiumForecastButton';
import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
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

function labelForSeries({
  dataKey,
  tiers,
}: {
  dataKey: string;
  tiers: ForecastTier[];
}): string {
  const isForecast = dataKey.toLowerCase().includes('pred');
  const tier = tiers.find((t) => dataKey.startsWith(`${t.key}`));
  const tierLabel = tier?.label ?? 'Tier';
  return `${tierLabel} · ${isForecast ? 'Forecast' : 'Actual'}`;
}

interface PlanPricingForecastChartProps {
  tiers: ForecastTier[];
  points: PricingPoint[];
  caption?: string | null;
  /** When set, show in-chart control to run weekly premium recommendations for this enrollment Monday */
  forecastGenerateWeekStart?: string | null;
}

export function PlanPricingForecastChart({
  tiers,
  points,
  caption,
  forecastGenerateWeekStart,
}: PlanPricingForecastChartProps) {
  const [forecastJobNote, setForecastJobNote] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const onForecastJobComplete = useCallback(
    (p: { ok: boolean; message: string } | null) => setForecastJobNote(p),
    [],
  );

  if (!points || points.length === 0) {
    return (
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5 min-w-0">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-w-0">
            <div className="flex flex-col justify-center gap-1 min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-white leading-tight">Next week forecast</p>
              <p className="text-[11px] text-[#555] leading-snug">
                No pricing history yet. Once snapshots exist, a forecast overlay will appear here.
              </p>
            </div>
            {forecastGenerateWeekStart ? (
              <div className="shrink-0 ml-auto flex items-center">
                <GeneratePremiumForecastButton
                  targetWeekStart={forecastGenerateWeekStart}
                  onJobComplete={onForecastJobComplete}
                />
              </div>
            ) : null}
          </div>
          {forecastJobNote ? (
            <p
              role={forecastJobNote.ok ? 'status' : 'alert'}
              className={cn(
                'text-[10px] leading-snug rounded-md px-2.5 py-1.5 border',
                forecastJobNote.ok
                  ? 'text-zinc-400 border-white/[0.06] bg-white/[0.03]'
                  : 'text-amber-200/90 border-amber-500/20 bg-amber-500/[0.07]',
              )}
            >
              {forecastJobNote.message}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const forecastPoint = points.find((p) => Boolean(p.isForecast));
  const forecastStart = forecastPoint?.weekStartDate ?? null;
  const lastX = points[points.length - 1]?.weekStartDate ?? null;

  return (
    <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5 min-w-0">
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-w-0">
          <div className="flex flex-col justify-center gap-1 min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-white leading-tight">Next week forecast</p>
            <p className="text-[11px] text-[#666] leading-snug">
              Solid = actual snapshots · Dashed = forecast
            </p>
          </div>
          <div className="flex flex-row items-center gap-3 shrink-0 ml-auto">
            {forecastGenerateWeekStart ? (
              <GeneratePremiumForecastButton
                targetWeekStart={forecastGenerateWeekStart}
                onJobComplete={onForecastJobComplete}
              />
            ) : null}
            {caption ? (
              <span className="inline-flex items-center min-h-[2.125rem] text-[10px] px-2.5 rounded-full bg-white/5 border border-white/10 text-[#9ca3af] tabular-nums max-w-[min(100%,280px)] leading-snug text-right">
                {caption}
              </span>
            ) : null}
          </div>
        </div>
        {forecastJobNote ? (
          <p
            role={forecastJobNote.ok ? 'status' : 'alert'}
            className={cn(
              'text-[10px] leading-snug rounded-md px-2.5 py-1.5 border',
              forecastJobNote.ok
                ? 'text-zinc-400 border-white/[0.06] bg-white/[0.03]'
                : 'text-amber-200/90 border-amber-500/20 bg-amber-500/[0.07]',
            )}
          >
            {forecastJobNote.message}
          </p>
        ) : null}
      </div>

      <div className="h-[clamp(260px,34vh,420px)] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={points} margin={{ top: 10, right: 18, left: 6, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
            <XAxis
              dataKey="weekStartDate"
              tickFormatter={formatShortDate}
              tick={{ fill: '#666666', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={18}
              tickMargin={10}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#666666', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={TOOLTIP_CURSOR}
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value, name) => {
                const n = Number(value);
                if (!Number.isFinite(n)) return [String(value), String(name)];
                return [formatINR(n), labelForSeries({ dataKey: String(name), tiers })];
              }}
            />

            {/* Forecast window mask (future period) */}
            {forecastStart && lastX && (
              <ReferenceArea
                x1={forecastStart}
                x2={lastX}
                ifOverflow="extendDomain"
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.06)"
              />
            )}

            {forecastStart && (
              <ReferenceLine
                x={forecastStart}
                stroke="rgba(255,255,255,0.18)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}

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
                opacity={0.55}
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
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-px w-6 bg-white/50" />
            <span className="text-[10px] text-[#666]">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-px w-6"
              style={{ borderTop: '1px dashed rgba(255,255,255,0.55)' }}
            />
            <span className="text-[10px] text-[#666]">Forecast</span>
          </div>
        </div>
      </div>
    </div>
  );
}

