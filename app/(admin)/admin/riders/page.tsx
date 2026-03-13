import { createAdminClient } from '@/lib/supabase/admin';
import { ChevronRight, Shield, Users } from 'lucide-react';
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Riders</h1>
          <p className="text-sm text-[#666] mt-1">View and manage delivery partner profiles</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20 tabular-nums">
          {profiles?.length ?? 0} total
        </span>
      </div>

      {profiles && profiles.length > 0 ? (
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2d2d2d] grid grid-cols-[1fr_auto_auto_auto_auto] gap-4">
            {['Name', 'Platform', 'Zone', 'Joined', ''].map((h) => (
              <span
                key={h || 'action'}
                className="text-[10px] font-medium text-[#555] uppercase tracking-[0.1em]"
              >
                {h}
              </span>
            ))}
          </div>
          <div className="divide-y divide-[#2d2d2d]">
            {profiles.map((p) => {
              const platform = (p.platform ?? '').toLowerCase();
              const color = platformColor[platform] ?? '#666';
              return (
                <Link
                  key={p.id}
                  href={`/admin/riders/${p.id}`}
                  className="px-5 py-3 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center hover:bg-[#1e1e1e] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {p.full_name ?? 'Unnamed rider'}
                        </p>
                        {(p as { role?: string }).role === 'admin' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#7dd3fc]/10 text-[#7dd3fc]">
                            <Shield className="h-2.5 w-2.5" /> Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#555] font-mono">{p.id.slice(0, 8)}...</p>
                    </div>
                  </div>

                  <span
                    className="text-xs font-medium whitespace-nowrap"
                    style={{ color: p.platform ? color : '#555' }}
                  >
                    {p.platform ?? '—'}
                  </span>

                  <span className="text-xs text-[#9ca3af] whitespace-nowrap">
                    {zoneName(p.primary_zone_geofence)}
                  </span>

                  <span className="text-xs text-[#555] whitespace-nowrap tabular-nums">
                    {formatDate(p.created_at)}
                  </span>

                  <ChevronRight className="h-3.5 w-3.5 text-[#3a3a3a] group-hover:text-[#666] transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl px-5 py-16 text-center">
          <Users className="h-8 w-8 text-[#3a3a3a] mx-auto mb-3" />
          <p className="text-sm text-[#555]">No riders registered yet</p>
        </div>
      )}
    </div>
  );
}
