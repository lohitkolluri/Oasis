'use client';

import { CopyableId } from '@/components/ui/CopyableId';
import { PlatformLogo } from '@/components/ui/PlatformLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type ProfileRow = {
  id: string;
  full_name: string | null;
  platform: string | null;
  role?: string | null;
  primary_zone_geofence: unknown;
  created_at: string;
};

interface RidersTableProps {
  profiles: ProfileRow[];
}

type PlatformFilter = 'all' | string;
type RoleFilter = 'all' | 'admin' | 'rider';

function zoneName(gf: unknown): string {
  const z = gf as { zone_name?: string; name?: string; label?: string } | null;
  return (
    z?.zone_name ??
    z?.name ??
    z?.label ??
    '—'
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export function RidersTable({ profiles }: RidersTableProps) {
  const [query, setQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const platforms = useMemo(
    () =>
      Array.from(
        new Set(
          profiles
            .map((p) => p.platform)
            .filter((p): p is string => !!p),
        ),
      ),
    [profiles],
  );

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (roleFilter === 'admin' && p.role !== 'admin') {
        return false;
      }
      if (roleFilter === 'rider' && (p.role === 'admin' || p.role == null)) {
        return false;
      }
      if (platformFilter !== 'all' && p.platform !== platformFilter) {
        return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const name = (p.full_name ?? '').toLowerCase();
        const id = p.id.toLowerCase();
        const zone = zoneName(p.primary_zone_geofence).toLowerCase();
        if (!name.includes(q) && !id.includes(q) && !zone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [profiles, platformFilter, query]);

  const totalCount = profiles.length;
  const visibleCount = filtered.length;

  const totalPages = Math.max(1, Math.ceil(visibleCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const rows = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] overflow-hidden">
      <div className="flex flex-col gap-3 px-5 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-white">Rider directory</p>
          <p className="text-[11px] text-[#6b7280]">
            Showing{' '}
            <span className="font-semibold text-[#e5e7eb]">
              {visibleCount === 0
                ? 0
                : `${startIndex + 1}–${Math.min(
                    startIndex + pageSize,
                    visibleCount,
                  )}`}
            </span>{' '}
            of{' '}
            <span className="tabular-nums">{totalCount}</span> riders
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide">
            <div className="inline-flex rounded-full bg-[#101010] p-1 text-[11px] border border-[#2d2d2d] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlatformFilter('all');
                  setPage(1);
                }}
                className={cn(
                  'h-8 px-3 text-[11px] font-medium !rounded-full',
                  'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]',
                  platformFilter === 'all' &&
                    'bg-[#161616] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-[#161616]',
                )}
              >
                All platforms
              </Button>
              {platforms.map((plat) => (
                <Button
                  key={plat}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPlatformFilter(plat);
                    setPage(1);
                  }}
                  className={cn(
                    'h-8 px-3 text-[11px] font-medium !rounded-full',
                    'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]',
                    platformFilter === plat &&
                      'bg-[#161616] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-[#161616]',
                  )}
                >
                  {plat}
                </Button>
              ))}
            </div>
          </div>

          <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide">
            <div className="inline-flex rounded-full bg-[#101010] p-1 text-[11px] border border-[#2d2d2d] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              {(['all', 'admin', 'rider'] as RoleFilter[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRoleFilter(value);
                    setPage(1);
                  }}
                  className={cn(
                    'h-8 px-3 text-[11px] font-medium !rounded-full',
                    'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]',
                    roleFilter === value &&
                      'bg-[#161616] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-[#161616]',
                  )}
                >
                  {value === 'all'
                    ? 'All roles'
                    : value === 'admin'
                      ? 'Admins'
                      : 'Riders'}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative w-full md:w-56">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, ID, or zone…"
              className="h-8 pl-2 pr-2 bg-[#050505] border-[#262626] text-xs placeholder:text-[#4b5563] rounded-md"
            />
          </div>
        </div>
      </div>

      {visibleCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center px-5 border-t border-[#2d2d2d]">
          <p className="text-sm font-medium text-[#555]">
            No riders match the current filters
          </p>
          <p className="text-xs text-[#444] mt-1">
            Try clearing the search or platform filter.
          </p>
        </div>
      ) : (
        <>
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
              {rows.map((p) => (
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
                          {p.role === 'admin' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20">
                              Admin
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

          <div className="flex items-center justify-between px-5 py-3 border-t border-[#2d2d2d] text-[11px] text-[#6b7280] bg-[#050505]">
            <div className="flex items-center gap-2">
              <span className="text-[#9ca3af]">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-full border border-[#2d2d2d] bg-[#111111] px-3 text-[11px] outline-none text-[#e5e7eb] focus-visible:ring-2 focus-visible:ring-white/10"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="tabular-nums text-[#9ca3af]">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={cn(
                    'h-8 px-4 text-[11px] !rounded-full border border-white/20 bg-transparent text-white',
                    'hover:bg-white hover:text-black hover:border-white',
                    'disabled:opacity-100 disabled:text-white/50 disabled:border-white/10 disabled:hover:bg-transparent disabled:hover:text-white/50 disabled:hover:border-white/10',
                  )}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(
                    'h-8 px-4 text-[11px] !rounded-full border border-white/20 bg-transparent text-white',
                    'hover:bg-white hover:text-black hover:border-white',
                    'disabled:opacity-100 disabled:text-white/50 disabled:border-white/10 disabled:hover:bg-transparent disabled:hover:text-white/50 disabled:hover:border-white/10',
                  )}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

