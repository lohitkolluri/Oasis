import { KPICard } from '@/components/ui/KPICard';
import { PlatformLogo } from '@/components/ui/PlatformLogo';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChevronRight, FileCheck } from 'lucide-react';
import Link from 'next/link';

type PolicyRow = {
  id: string;
  profile_id: string;
  week_start_date: string;
  week_end_date: string;
  weekly_premium_inr: number;
  is_active: boolean;
  profiles: { full_name?: string; platform?: string; primary_zone_geofence?: unknown } | null;
  plan_packages: { name?: string; slug?: string } | null;
};

const zoneName = (gf: unknown) => {
  const z = gf as { zone_name?: string } | null;
  return z?.zone_name ?? '—';
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function PolicyTable({
  policies,
  showStatus,
  emptyMessage,
}: {
  policies: PolicyRow[];
  showStatus: boolean;
  emptyMessage: string;
}) {
  if (policies.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-[#555]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-[#2d2d2d]">
          <TableHead className="w-[min(280px,40%)]">Rider / Plan</TableHead>
          <TableHead className="w-[140px]">Week</TableHead>
          <TableHead className="w-[100px] text-right">Premium</TableHead>
          {showStatus && (
            <TableHead className="w-[100px]">Status</TableHead>
          )}
          <TableHead className="w-[44px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {policies.map((p) => {
          const profile = p.profiles;
          const plan = p.plan_packages;
          return (
            <TableRow key={p.id} className="border-[#2d2d2d]">
              <TableCell className="font-medium">
                <div className="flex items-center gap-3 min-w-0">
                  <PlatformLogo platform={profile?.platform} size={32} showName />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">
                      {profile?.full_name ?? 'Unknown'}
                    </p>
                    <p className="truncate text-[11px] text-[#666]">
                      {plan?.name ?? 'Legacy'} · {zoneName(profile?.primary_zone_geofence)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-[#9ca3af] tabular-nums text-xs">
                {formatDate(p.week_start_date)} – {formatDate(p.week_end_date)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-white">
                ₹{Number(p.weekly_premium_inr).toLocaleString('en-IN')}
              </TableCell>
              {showStatus && (
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      p.is_active
                        ? 'border-[#22c55e]/20 bg-[#22c55e]/10 text-[#22c55e]'
                        : 'border-[#3a3a3a] bg-[#262626] text-[#737373]'
                    }`}
                  >
                    {p.is_active ? 'Active' : 'Expired'}
                  </span>
                </TableCell>
              )}
              <TableCell className="p-0">
                <Link
                  href={`/admin/riders/${p.profile_id}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#555] transition-colors hover:bg-[#1e1e1e] hover:text-[#7dd3fc]"
                  title="View rider"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function AdminPoliciesPage() {
  const supabase = createAdminClient();

  const { data: policies } = await supabase
    .from('weekly_policies')
    .select(
      `
      id,
      profile_id,
      plan_id,
      week_start_date,
      week_end_date,
      weekly_premium_inr,
      is_active,
      created_at,
      profiles(full_name, platform, primary_zone_geofence),
      plan_packages(name, slug)
    `,
    )
    .order('week_start_date', { ascending: false })
    .limit(100);

  const activePolicies = (policies ?? []).filter((p) => p.is_active) as PolicyRow[];
  const expiredPolicies = (policies ?? []).filter((p) => !p.is_active) as PolicyRow[];
  const expiredToShow = expiredPolicies.slice(0, 25);

  const activeCount = activePolicies.length;
  const activePremium = activePolicies.reduce(
    (s, p) => s + Number(p.weekly_premium_inr),
    0,
  );
  const plansInUse = new Set(
    (policies ?? [])
      .filter((p) => p.plan_id)
      .map((p) => (p.plan_packages as { slug?: string })?.slug ?? 'legacy'),
  ).size;

  const hasAnyPolicies = (policies?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Policy Monitoring
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Weekly policies. Active and expired coverage
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard
          title="Active Policies"
          label="Current week"
          value={activeCount}
          accent="cyan"
        />
        <KPICard
          title="Total Premium"
          label="Active only"
          value={`₹${activePremium.toLocaleString('en-IN')}`}
          accent="emerald"
        />
        <KPICard
          title="Plans in Use"
          label="Distinct"
          value={plansInUse}
          accent="violet"
        />
      </div>

      {!hasAnyPolicies ? (
        <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] flex flex-col items-center justify-center py-16 text-center">
          <FileCheck className="h-10 w-10 text-[#3a3a3a] mb-4" />
          <p className="text-sm font-medium text-[#555]">No policies yet</p>
          <p className="text-xs text-[#444] mt-1">
            Policies appear here when riders subscribe to weekly coverage
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active policies — primary focus */}
          <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] overflow-hidden flex flex-col">
            <div className="border-b border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Active policies
              </h2>
              <span className="text-[11px] text-[#555] tabular-nums">
                {activeCount} policy{activeCount !== 1 ? 'ies' : ''}
              </span>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              <PolicyTable
                policies={activePolicies}
                showStatus={false}
                emptyMessage="No active policies this week"
              />
            </div>
          </div>

          {/* Expired policies — secondary, limited list */}
          <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] overflow-hidden flex flex-col">
            <div className="border-b border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#737373]">
                Expired (past weeks)
              </h2>
              <span className="text-[11px] text-[#555] tabular-nums">
                {expiredPolicies.length > 0
                  ? `Showing ${expiredToShow.length} of ${expiredPolicies.length}`
                  : 'None'}
              </span>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              <PolicyTable
                policies={expiredToShow}
                showStatus={false}
                emptyMessage="No expired policies"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
