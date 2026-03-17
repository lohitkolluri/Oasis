'use client';

import { Card } from '@/components/ui/Card';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface WeeklyEarningsChartProps {
  /** Earnings per day Mon–Sun (7 numbers). */
  dailyEarnings: number[];
  /** Optional: index 0–6 for current day to highlight. */
  currentDayIndex?: number;
}

export function WeeklyEarningsChart({
  dailyEarnings,
  currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
}: WeeklyEarningsChartProps) {
  const safeEarnings = Array.from({ length: 7 }, (_, i) => dailyEarnings[i] ?? 0);
  const total = safeEarnings.reduce((a, b) => a + b, 0);
  const data = DAY_LABELS.map((label, i) => ({
    day: label,
    earnings: safeEarnings[i],
    isCurrent: i === currentDayIndex,
  }));

  const maxEarnings = Math.max(...safeEarnings, 1);
  const hasData = total > 0;
  const tooltipCursor = { fill: 'rgba(255,255,255,0.04)' };

  return (
    <Card variant="default" padding="none" className="rounded-2xl border-white/10 bg-surface-1 overflow-hidden">
    <div className="w-full">
      <div className="px-4 pt-4 pb-1.5 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-zinc-200">Earnings this week</h3>
        <span className="text-[13px] font-bold text-uber-green tabular-nums">
          ₹{total.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="w-full min-w-0 h-[160px] px-3 pb-3">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
            <p className="text-[13px] text-zinc-400 font-medium">No earnings this week yet</p>
            <p className="text-[11px] text-zinc-500 max-w-[220px] leading-relaxed">
              Payouts will appear here when disruptions trigger in your zone
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Mon · Tue · Wed · Thu · Fri · Sat · Sun
            </p>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 100, height: 180 }}
          >
            <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#737373', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis hide domain={[0, maxEarnings * 1.2]} />
              <Tooltip
                cursor={tooltipCursor}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;

                  return (
                    <div className="rounded-xl border border-white/10 bg-[#0f0f10]/95 px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur">
                      <p className="text-xs font-medium text-zinc-300">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-100">
                        Earnings: ₹{Number(payload[0]?.value ?? 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="earnings"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
                isAnimationActive
                animationDuration={600}
                animationEasing="ease-out"
              >
                {data.map((entry) => (
                  <Cell key={entry.day} fill="#3AA76D" opacity={entry.isCurrent ? 1 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
    </Card>
  );
}
