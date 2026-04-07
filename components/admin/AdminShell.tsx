'use client';

import { AdminNav } from '@/components/admin/AdminNav';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { SidebarUser } from '@/components/admin/SidebarUser';
import { Logo } from '@/components/ui/Logo';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PanelLeft, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'oasis-admin-sidebar-collapsed';

type AdminShellProps = {
  userName: string;
  userEmail: string | null;
  role?: string | null;
  children: React.ReactNode;
};

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  } catch {
    // ignore
  }
}

export function AdminShell({ userName, userEmail, role, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const sidebarWidth = collapsed ? 72 : 260;

  const sidebarStyle = useMemo(() => {
    return { width: `${sidebarWidth}px` } as const;
  }, [sidebarWidth]);

  return (
    <div
      className="min-h-screen bg-[#0f0f0f] flex"
      style={{ '--admin-sidebar-w': `${sidebarWidth}px` } as any}
    >
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 bg-[#161616] border-r border-[#2d2d2d] flex flex-col z-20 hidden md:flex"
        style={sidebarStyle}
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        <div
          className={cn(
            'relative flex items-center gap-2 px-3 py-3 mb-2 shrink-0',
            collapsed ? 'flex-col justify-center gap-2 pt-3 pb-2' : 'justify-center',
          )}
        >
          <Link
            href="/admin"
            className={cn('flex items-center gap-2 min-w-0', collapsed && 'gap-0')}
          >
            <Logo size={28} className="shrink-0" />
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-semibold text-white leading-tight tracking-tight truncate">
                  Oasis
                </p>
                <p className="text-xs text-muted-foreground leading-tight truncate">
                  Admin Console
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => {
              setCollapsed((v) => {
                const next = !v;
                writeCollapsed(next);
                return next;
              });
            }}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md',
              'text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors',
              collapsed ? 'mt-1' : 'ml-auto',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft
              className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
              aria-hidden
            />
          </button>
        </div>

        <Separator className="mx-3 bg-[#2d2d2d]" />

        <AdminNav collapsed={collapsed} />

        <Separator className="mx-3 bg-[#2d2d2d]" />

        <div className={cn('p-3 mt-auto shrink-0', collapsed && 'px-2')}>
          <SidebarUser name={userName} role={role} email={userEmail} collapsed={collapsed} />
        </div>
      </aside>

      {/* Content */}
      <div
        className="flex-1 min-w-0 flex flex-col"
        style={{ marginLeft: `var(--admin-sidebar-w)` }}
      >
        <header className="sticky top-0 z-10 h-[48px] border-b border-[#2d2d2d] bg-[#0f0f0f] px-6 lg:px-8 flex items-center justify-between shrink-0">
          <Link
            href="/admin"
            className="md:hidden flex items-center gap-2 text-sm font-semibold text-white"
          >
            <Logo size={24} />
            Oasis Admin
          </Link>

          <div className="hidden md:flex items-center">
            <AdminSearch />
          </div>

          <div className="flex items-center gap-3 ml-auto md:ml-0">
            <Link
              href="/dashboard"
              className="hidden md:flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Rider App
            </Link>
          </div>
        </header>

        <main className="flex-1 px-6 py-6 lg:px-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
