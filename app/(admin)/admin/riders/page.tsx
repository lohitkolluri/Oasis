import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft, ChevronRight, Shield, User } from 'lucide-react';
import Link from 'next/link';

export default async function AdminRidersPage() {
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      phone_number,
      platform,
      role,
      primary_zone_geofence,
      zone_latitude,
      zone_longitude,
      created_at
    `,
    )
    .order('created_at', { ascending: false });

  const zoneName = (gf: unknown) => {
    const z = gf as { zone_name?: string } | null;
    return z?.zone_name ?? '—';
  };

  const platformColor: Record<string, string> = {
    zepto: '#7dd3fc',
    blinkit: '#f59e0b',
    swiggy: '#f97316',
    zomato: '#ef4444',
  };

  return (
    <div className="space-y-8 py-2">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-white transition-colors group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.15em] mb-1">Admin Console</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Riders</h1>
          <p className="text-sm text-[#666666] mt-1">View and manage delivery partner profiles</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20">
          {profiles?.length ?? 0} total
        </span>
      </div>

      {/* Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {profiles?.map((p) => {
          const platform = (p.platform ?? '').toLowerCase();
          const color = platformColor[platform] ?? '#666666';
          return (
            <Link key={p.id} href={`/admin/riders/${p.id}`}>
              <div className="group bg-[#161616] border border-[#2d2d2d] rounded-2xl px-5 py-4 hover:border-[#3a3a3a] hover:shadow-[0_0_16px_rgba(125,211,252,0.08)] transition-all duration-200">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all"
                    style={{
                      background: `${color}14`,
                      border: `1px solid ${color}28`,
                    }}
                  >
                    <User className="h-4 w-4" style={{ color }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">
                        {p.full_name ?? 'Unnamed rider'}
                      </p>
                      {(p as { role?: string }).role === 'admin' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20">
                          <Shield className="h-2.5 w-2.5" /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#666666] mt-0.5">
                      {p.platform ? (
                        <span style={{ color }}>{p.platform}</span>
                      ) : '—'}
                      {' · '}{zoneName(p.primary_zone_geofence)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-[10px] text-[#3a3a3a] font-mono hidden sm:block">
                      {p.id.slice(0, 8)}…
                    </p>
                    <ChevronRight className="h-4 w-4 text-[#3a3a3a] group-hover:text-[#666666] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {(!profiles || profiles.length === 0) && (
          <div className="col-span-2 bg-[#161616] border border-[#2d2d2d] rounded-2xl px-5 py-16 text-center">
            <User className="h-8 w-8 text-[#3a3a3a] mx-auto mb-3" />
            <p className="text-sm text-[#666666]">No riders registered yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
