import { SystemHealth } from '@/components/admin/SystemHealth';

export default function ApiHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          System Health
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Status of external parametric data providers and Oasis services.
        </p>
      </div>

      <SystemHealth showRecentEvents={false} />
    </div>
  );
}

