'use client';

import type { KPICardAccent } from '@/components/ui/KPICard';
import { KPICard } from '@/components/ui/KPICard';

interface KPIGridProps {
  totalEarnings: number;
  claimsPaid: number;
  hasActiveCoverage: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export function KPIGrid({ totalEarnings, claimsPaid, hasActiveCoverage, riskLevel }: KPIGridProps) {
  const riskLabel = riskLevel === 'high' ? 'High' : riskLevel === 'medium' ? 'Medium' : 'Low';

  const metrics: Array<{
    id: string;
    title: string;
    count?: number;
    label: string;
    value: string | number;
    accent: KPICardAccent;
  }> = [
    {
      id: 'earnings',
      title: 'Total Earnings',
      count: 1,
      label: 'This period',
      value: `₹${totalEarnings.toLocaleString('en-IN')}`,
      accent: 'amber',
    },
    {
      id: 'claims',
      title: 'Claims Paid',
      count: claimsPaid,
      label: 'Claims',
      value: claimsPaid,
      accent: 'purple',
    },
    {
      id: 'coverage',
      title: 'Active Coverage',
      count: hasActiveCoverage ? 1 : 0,
      label: 'Status',
      value: hasActiveCoverage ? 'Active' : 'None',
      accent: 'emerald',
    },
    {
      id: 'risk',
      title: 'Risk Level',
      label: 'Zone risk',
      value: riskLabel,
      accent: riskLevel === 'high' ? 'red' : riskLevel === 'medium' ? 'amber' : 'blue',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {metrics.map((m, i) => (
        <KPICard
          key={m.id}
          title={m.title}
          count={m.count}
          label={m.label}
          value={m.value}
          accent={m.accent}
          index={i}
        />
      ))}
    </div>
  );
}
