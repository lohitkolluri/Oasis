'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '@/components/ui/ChartCard';
import { BarChart2 } from 'lucide-react';

type ZoneBucket = {
  zone: string;
  premium: number;
  payouts: number;
  policyCount: number;
};

type PlanBucket = {
  slug: string;
  name: string;
  premium: number;
  payouts: number;
  policyCount: number;
};

interface RevenueChartsProps {
  zones: ZoneBucket[];
  plans: PlanBucket[];
}

const TOOLTIP_STYLE = {
  backgroundColor: '#161616',
  border: '1px solid #2d2d2d',
  borderRadius: 10,
  fontSize: 11,
  color: '#9ca3af',
};

export function RevenueCharts({ zones, plans }: RevenueChartsProps) {
  const zoneData = zones.slice(0, 6).map((z) => ({
    zone: z.zone,
    lossRatio: z.premium > 0 ? Number(((z.payouts / z.premium) * 100).toFixed(1)) : 0,
  }));

  const planData = plans.map((p) => ({
    name: p.name,
    premium: p.premium,
    payouts: p.payouts,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard
        title="Zone loss ratio"
        subtitle={
          zoneData.length > 0
            ? `Top ${zoneData.length} zones by premium volume`
            : 'Loss ratios will appear once riders have geofenced zones'
        }
        icon={BarChart2}
      >
        {zoneData.length === 0 ? (
          <p className="text-[11px] text-[#555]">
            No zone data yet. Once profiles have geofenced zones, loss ratios by area will appear
            here.
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={zoneData}
                margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
              >
                <CartesianGrid
                  stroke="#1f2937"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="zone"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                  width={40}
                  unit="%"
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${value}%`, 'Loss ratio']}
                />
                <Bar
                  dataKey="lossRatio"
                  radius={[4, 4, 0, 0]}
                  fill="#f97316"
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Plan mix"
        subtitle="Premium vs. payouts by tier"
        icon={BarChart2}
      >
        {planData.length === 0 ? (
          <p className="text-[11px] text-[#555]">
            No active plans yet. Configure Basic, Standard, and Premium tiers to see plan mix.
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={planData}
                margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
              >
                <CartesianGrid
                  stroke="#1f2937"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                  width={60}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, key) => [
                    `₹${Number(value as number).toLocaleString('en-IN')}`,
                    key === 'premium' ? 'Premium' : 'Payouts',
                  ]}
                />
                <Bar
                  dataKey="premium"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                  fill="#22c55e"
                  maxBarSize={40}
                />
                <Bar
                  dataKey="payouts"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                  fill="#ef4444"
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

