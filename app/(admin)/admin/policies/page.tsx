import { KPICard } from '@/components/ui/KPICard';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChevronRight, FileCheck, Shield } from 'lucide-react';
import Link from 'next/link';

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

  const zoneName = (gf: unknown) => {
    const z = gf as { zone_name?: string } | null;
    return z?.zone_name ?? '—';
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const activeCount = policies?.filter((p) => p.is_active).length ?? 0;
  const activePremium =
    policies
      ?.filter((p) => p.is_active)
      .reduce((s, p) => s + Number(p.weekly_premium_inr), 0) ?? 0;
  const plansInUse =
    new Set(
      policies
        ?.filter((p) => p.plan_id)
        .map((p) => (p.plan_packages as { slug?: string })?.slug ?? 'legacy'),
    ).size ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Policy Monitoring</h1>
        <p className="text-sm text-[#666] mt-1">All weekly policies. Active and expired</p>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard
          title="Active Policies"
          label="Current"
          value={activeCount}
          accent="cyan"
        />
        <KPICard
          title="Total Premium"
          label="Active policies"
          value={`₹${activePremium.toLocaleString('en-IN')}`}
          accent="emerald"
        />
        <KPICard
          title="Plans in Use"
          label="Distinct plans"
          value={plansInUse}
          accent="violet"
        />
      </div>

      {/* Policies table */}
      {policies && policies.length > 0 ? (
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl overflow-hidden">
          <div className="px-5 py-2.5 border-b border-[#2d2d2d] grid grid-cols-[1fr_auto_auto_auto] gap-4">
            {['Rider / Plan', 'Week', 'Premium', 'Status'].map((h) => (
              <span
                key={h}
                className="text-[10px] font-medium text-[#555] uppercase tracking-[0.1em]"
              >
                {h}
              </span>
            ))}
          </div>
          <div className="divide-y divide-[#2d2d2d]">
            {policies.map((p) => {
              const profile = p.profiles as {
                full_name?: string;
                platform?: string;
                primary_zone_geofence?: unknown;
              } | null;
              const plan = p.plan_packages as { name?: string; slug?: string } | null;
              return (
                <div
                  key={p.id}
                  className="px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center hover:bg-[#1e1e1e] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center shrink-0">
                      <Shield className="h-3.5 w-3.5 text-[#22c55e]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {profile?.full_name ?? 'Unknown'}
                      </p>
                      <p className="text-[10px] text-[#555] truncate">
                        {plan?.name ?? 'Legacy'} · {profile?.platform ?? '—'} ·{' '}
                        {zoneName(profile?.primary_zone_geofence)}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-[#666] whitespace-nowrap tabular-nums">
                    {formatDate(p.week_start_date)} – {formatDate(p.week_end_date)}
                  </span>

                  <span className="text-sm font-bold text-white tabular-nums whitespace-nowrap">
                    ₹{Number(p.weekly_premium_inr).toLocaleString('en-IN')}
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        p.is_active
                          ? 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20'
                          : 'text-[#555] bg-[#262626] border-[#3a3a3a]'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Expired'}
                    </span>
                    <Link
                      href={`/admin/riders/${p.profile_id}`}
                      className="text-[#3a3a3a] hover:text-[#7dd3fc] transition-colors"
                      title="View rider"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-5 py-16 text-center">
          <FileCheck className="h-8 w-8 text-[#3a3a3a] mx-auto mb-3" />
          <p className="text-sm text-[#555]">No policies yet</p>
        </div>
      )}
    </div>
  );
}
