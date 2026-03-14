'use client';

import { Loader2 } from 'lucide-react';
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
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-5 py-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-[#555]" />
      </div>
    );
  }

  const ok = data?.status === 'healthy' && (data?.errors24h ?? 0) === 0;

  return (
    <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-5 py-4">
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
    </div>
  );
}
