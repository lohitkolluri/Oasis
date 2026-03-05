import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft, ChevronRight, FileCheck, Shield } from 'lucide-react';
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
  const activePremium = policies?.filter((p) => p.is_active).reduce((s, p) => s + Number(p.weekly_premium_inr), 0) ?? 0;
  const plansInUse = new Set(policies?.filter((p) => p.plan_id).map((p) => (p.plan_packages as { slug?: string })?.slug ?? 'legacy')).size ?? 0;

  return (
    <div className="space-y-8 py-2">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-white transition-colors group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </Link>

      <div>
        <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.15em] mb-1">Admin Console</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Policy Monitoring</h1>
        <p className="text-sm text-[#666666] mt-1">All weekly policies. Active and expired</p>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Active Policies', value: activeCount, color: 'text-[#7dd3fc]', barColor: '#7dd3fc' },
          { label: 'Total Premium (active)', value: `₹${activePremium.toLocaleString('en-IN')}`, color: 'text-[#22c55e]', barColor: '#22c55e' },
          { label: 'Plans in Use', value: plansInUse, color: 'text-white', barColor: '#a78bfa' },
        ].map((m, i) => (
          <div
            key={m.label}
            className="bg-[#161616] border border-[#2d2d2d] rounded-2xl p-5 overflow-hidden relative"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `${m.barColor}40` }} />
            <p className="text-[11px] font-medium text-[#666666] uppercase tracking-wide mb-2">{m.label}</p>
            <p className={`text-3xl font-bold tabular-nums tracking-tight ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Policies list */}
      <div>
        <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em] mb-4">Recent Policies</p>

        {/* Table header */}
        {policies && policies.length > 0 && (
          <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#2d2d2d] grid grid-cols-[1fr_auto_auto_auto] gap-4">
              {['Rider / Plan', 'Week', 'Premium', 'Status'].map((h) => (
                <span key={h} className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em]">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-[#2d2d2d]">
              {policies.map((p) => {
                const profile = p.profiles as { full_name?: string; platform?: string; primary_zone_geofence?: unknown; } | null;
                const plan = p.plan_packages as { name?: string; slug?: string } | null;
                return (
                  <div key={p.id} className="px-5 py-4 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center hover:bg-[#1e1e1e] transition-colors">
                    {/* Rider + plan */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center shrink-0">
                        <Shield className="h-3.5 w-3.5 text-[#22c55e]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {profile?.full_name ?? 'Unknown'}
                        </p>
                        <p className="text-[10px] text-[#666666] truncate">
                          {plan?.name ?? 'Legacy'} · {profile?.platform ?? '—'} · {zoneName(profile?.primary_zone_geofence)}
                        </p>
                      </div>
                    </div>

                    {/* Week */}
                    <span className="text-xs text-[#666666] whitespace-nowrap tabular-nums">
                      {formatDate(p.week_start_date)} – {formatDate(p.week_end_date)}
                    </span>

                    {/* Premium */}
                    <span className="text-sm font-bold text-white tabular-nums whitespace-nowrap">
                      ₹{Number(p.weekly_premium_inr).toLocaleString('en-IN')}
                    </span>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                        p.is_active
                          ? 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20'
                          : 'text-[#666666] bg-[#262626] border-[#3a3a3a]'
                      }`}>
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
        )}

        {(!policies || policies.length === 0) && (
          <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl px-5 py-16 text-center">
            <FileCheck className="h-8 w-8 text-[#3a3a3a] mx-auto mb-3" />
            <p className="text-sm text-[#666666]">No policies yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
