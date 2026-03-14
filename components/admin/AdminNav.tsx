'use client';

import {
  Activity,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileCheck,
  FlaskConical,
  Folder,
  FolderOpen,
  LayoutDashboard,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'oasis-admin-nav-open';

const navSections = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
      { href: '/admin/policies', label: 'Policies', icon: FileCheck },
      { href: '/admin/triggers', label: 'Triggers', icon: Zap },
      { href: '/admin/riders', label: 'Riders', icon: Users },
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    items: [{ href: '/admin/payments', label: 'Payments', icon: CreditCard }],
  },
  {
    id: 'review',
    label: 'Review',
    items: [
      { href: '/admin/fraud', label: 'Fraud Queue', icon: ShieldAlert },
      { href: '/admin/health', label: 'System Health', icon: Activity },
      { href: '/admin/demo', label: 'Demo', icon: FlaskConical },
    ],
  },
];

export const adminNavItems = navSections.flatMap((s) => s.items);

function readOpenState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeOpenState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function AdminNav() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({}));

  useEffect(() => {
    setOpenSections(readOpenState());
  }, []);

  const setSectionOpen = useCallback((id: string, open: boolean) => {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: open };
      writeOpenState(next);
      return next;
    });
  }, []);

  const hasActiveChild = useCallback(
    (section: (typeof navSections)[0]) => {
      return section.items.some((item) => {
        if (item.href === '/admin') return pathname === '/admin' || pathname === '/admin/';
        return pathname.startsWith(item.href);
      });
    },
    [pathname],
  );

  return (
    <nav className="flex-1 px-2 py-3 overflow-y-auto min-h-0">
      <ul className="space-y-0.5" role="tree" aria-label="Admin navigation">
        {navSections.map((section) => {
          const isOpen = openSections[section.id] ?? true;
          const hasActive = hasActiveChild(section);
          const hasSingleItem = section.items.length === 1;

          return (
            <li key={section.id} className="relative" role="none">
              {/* Section header (tree node) */}
              <button
                type="button"
                onClick={() => setSectionOpen(section.id, !isOpen)}
                className={cn(
                  'w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-left transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3fc]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#161616]',
                  hasActive && isOpen
                    ? 'text-[#9ca3af]'
                    : 'text-[#737373] hover:text-[#9ca3af] hover:bg-[#1e1e1e]',
                )}
                aria-expanded={isOpen}
                aria-label={`${section.label}, ${isOpen ? 'collapse' : 'expand'}`}
              >
                <span className="flex items-center justify-center w-5 h-5 shrink-0 text-[#555]">
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                <span className="flex items-center justify-center w-5 h-5 shrink-0 text-[#555]">
                  {isOpen ? (
                    <FolderOpen className="h-4 w-4" aria-hidden />
                  ) : (
                    <Folder className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <span className="text-xs font-medium truncate">{section.label}</span>
              </button>

              {/* Children (tree leaves) */}
              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-200 ease-out',
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
                role="group"
                aria-label={section.label}
              >
                <div className="overflow-hidden">
                  <div
                    className={cn(
                      'border-l border-[#2d2d2d] ml-4 mt-0.5 pl-1 space-y-0.5',
                      hasSingleItem && 'pb-0.5',
                    )}
                  >
                    {section.items.map(({ href, label, icon: Icon }) => {
                      const isActive =
                        href === '/admin'
                          ? pathname === '/admin' || pathname === '/admin/'
                          : pathname.startsWith(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            'group/item relative flex items-center gap-2.5 py-2 px-2.5 rounded-md text-sm font-medium transition-colors duration-150 -ml-px border-l-2',
                            isActive
                              ? 'bg-[#1e1e1e] text-white border-[#7dd3fc]'
                              : 'border-transparent text-[#737373] hover:text-white hover:bg-[#1e1e1e]',
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors',
                              isActive ? 'text-[#7dd3fc]' : 'text-[#555] group-hover/item:text-[#9ca3af]',
                            )}
                          />
                          <span className="truncate">{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
