import { CopyableId } from '@/components/ui/CopyableId';
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Riders
          </h1>
          <p className="text-sm text-[#666] mt-1">
            View and manage delivery partner profiles
          </p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20 tabular-nums font-medium">
          {profiles?.length ?? 0} total
        </span>
      </div>

      {profiles && profiles.length > 0 ? (
        <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                <TableHead className="w-[min(280px,35%)]">Name</TableHead>
                <TableHead className="w-[80px]">Platform</TableHead>
                <TableHead className="w-[140px]">Zone</TableHead>
                <TableHead className="w-[100px]">Joined</TableHead>
                <TableHead className="w-[44px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id} className="border-[#2d2d2d] group">
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/riders/${p.id}`}
                      className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity"
                    >
                      <PlatformLogo platform={p.platform} size={32} showName />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">
                            {p.full_name ?? 'Unnamed rider'}
                          </span>
                          {(p as { role?: string }).role === 'admin' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20">
                              <Shield className="h-2.5 w-2.5" /> Admin
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5">
                          <CopyableId value={p.id} prefix="" label="Copy rider ID" />
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <PlatformLogo platform={p.platform} size={24} showName />
                    </div>
                  </TableCell>
                  <TableCell className="text-[#9ca3af] text-xs">
                    {zoneName(p.primary_zone_geofence)}
                  </TableCell>
                  <TableCell className="text-xs text-[#9ca3af] tabular-nums">
                    {formatDate(p.created_at)}
                  </TableCell>
                  <TableCell className="p-0 w-[44px]">
                    <Link
                      href={`/admin/riders/${p.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#555] transition-colors hover:bg-[#1e1e1e] hover:text-[#7dd3fc]"
                      title="View rider"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-[#3a3a3a] mb-4" />
          <p className="text-sm font-medium text-[#555]">No riders registered yet</p>
          <p className="text-xs text-[#444] mt-1">
            Riders appear here after they complete onboarding
          </p>
        </div>
      )}
    </div>
  );
}
