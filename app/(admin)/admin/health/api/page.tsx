import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
import { SystemHealth } from '@/components/admin/SystemHealth';

export default function ApiHealthPage() {
  return (
    <div className="space-y-6">
      <AdminPageTitle
        title="System Health"
        help="Probe cards for third-party APIs (weather, AQI, traffic, news, etc.) and internal routes the adjudicator relies on. Use this page to see timeouts, auth issues, or degraded providers before trusting trigger output."
        description="Status of external parametric data providers and Oasis services."
      />

      <SystemHealth showRecentEvents={false} />
    </div>
  );
}

