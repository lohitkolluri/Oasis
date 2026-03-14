'use client';

import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface HealthData {
  status: 'healthy' | 'degraded' | 'warning' | 'unhealthy';
  errors24h: number;
}

export function OverviewStatus() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/system-health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? { status: d.status, errors24h: d.errors24h ?? 0 } : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card variant="default" padding="md" className="flex items-center justify-center">
        <Skeleton className="h-5 w-32" />
      </Card>
    );
  }

  const ok = data?.status === 'healthy' && (data?.errors24h ?? 0) === 0;

  return (
    <Card variant="default" padding="md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              ok ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'
            }`}
          />
          <span className="text-sm text-[#9ca3af]">
            {ok ? 'All systems operational' : (data?.errors24h ?? 0) > 0 ? `${data?.errors24h} issue(s) in last 24h` : 'Degraded'}
          </span>
        </div>
        <Link
          href="/admin/health"
          className="text-[11px] font-medium text-[#7dd3fc] hover:text-white transition-colors"
        >
          Details
        </Link>
      </div>
    </Card>
  );
}
