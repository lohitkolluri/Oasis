'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35 }}
      className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden"
    >
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-zinc-200">
          Earnings this week
        </h3>
        <span className="text-sm font-bold text-uber-green tabular-nums">
          ₹{total.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="w-full min-w-0 h-[180px] px-3 pb-4">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-[13px] text-zinc-400 font-medium">
              No earnings this week yet
            </p>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              Payouts will appear here when disruptions trigger in your zone
            </p>
            <div className="flex gap-1.5 mt-2">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="w-6 h-8 rounded-t bg-white/5"
                  title={d}
                  aria-hidden
                />
              ))}
            </div>
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
              <YAxis
                hide
                domain={[0, maxEarnings * 1.2]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-1)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => [`₹${Number(value ?? 0).toLocaleString('en-IN')}`, 'Earnings']}
                labelFormatter={(label) => label}
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
                  <Cell
                    key={entry.day}
                    fill="#3AA76D"
                    opacity={entry.isCurrent ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
