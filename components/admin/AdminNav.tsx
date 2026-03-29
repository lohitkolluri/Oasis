'use client';

import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileCheck,
  FlaskConical,
  Folder,
  Gavel,
  LayoutDashboard,
  PiggyBank,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'oasis-admin-nav-open';

const navSections = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
      { href: '/admin/policies', label: 'Policies', icon: FileCheck },
      { href: '/admin/triggers', label: 'Triggers', icon: Zap },
      { href: '/admin/governance', label: 'Governance', icon: Gavel },
      { href: '/admin/riders', label: 'Riders', icon: Users },
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    items: [
      { href: '/admin/payments', label: 'Payments', icon: CreditCard },
      { href: '/admin/financial/revenue', label: 'Revenue & Loss', icon: BarChart },
      { href: '/admin/financial/reserves', label: 'Reserves & stress', icon: PiggyBank },
      { href: '/admin/financial/plans', label: 'Plans & Pricing', icon: Wallet },
    ],
  },
  {
    id: 'review',
    label: 'Review',
    items: [
      { href: '/admin/fraud', label: 'Fraud Queue', icon: ClipboardCheck },
      {
        href: '/admin/health',
        label: 'System Health',
        icon: Activity,
        children: [
          { href: '/admin/health/api', label: 'API Health', icon: Activity },
          { href: '/admin/health/logs', label: 'System Logs', icon: ClipboardCheck },
        ],
      },
      { href: '/admin/demo', label: 'Demo', icon: FlaskConical },
    ],
  },
];

export const adminNavItems = navSections.flatMap((s) => s.items);

type NavSection = (typeof navSections)[number];
type NavItem = NavSection['items'][number] & {
  children?: NavItem[];
};

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
    (section: NavSection) => {
      return section.items.some((item) => {
        if (item.href === '/admin') return pathname === '/admin' || pathname === '/admin/';
        return pathname.startsWith(item.href);
      });
    },
    [pathname],
  );

  return (
    <nav className="flex flex-1 flex-col px-2 py-3 overflow-y-auto min-h-0">
      <ul className="space-y-5" role="tree" aria-label="Admin navigation">
        {navSections.map((section) => {
          const isOpen = openSections[section.id] ?? true;
          const hasActive = hasActiveChild(section);

          return (
            <li key={section.id} className="relative" role="none">
              <SidebarSection
                section={section}
                isOpen={isOpen}
                hasActive={hasActive}
                onToggle={() => setSectionOpen(section.id, !isOpen)}
              >
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.href}
                    item={item as NavItem}
                    pathname={pathname}
                    depth={0}
                  />
                ))}
              </SidebarSection>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface SidebarSectionProps {
  section: NavSection;
  isOpen: boolean;
  hasActive: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SidebarSection({ section, isOpen, hasActive, onToggle, children }: SidebarSectionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] rounded-md',
          'text-muted-foreground/60 hover:text-muted-foreground/90',
          'transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          hasActive && 'text-muted-foreground/80',
        )}
        aria-expanded={isOpen}
        aria-label={`${section.label}, ${isOpen ? 'collapse' : 'expand'}`}
      >
        <span className="truncate">{section.label}</span>
        <ChevronRight
          className={cn(
            'ml-auto h-3 w-3 opacity-40 transition-transform duration-200',
            isOpen && 'rotate-90',
          )}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
        role="group"
        aria-label={section.label}
      >
        <div className="overflow-hidden">
          <div className="mt-1 space-y-0.5 pl-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SidebarItemProps {
  item: NavItem;
  pathname: string;
  depth: number;
  parentActive?: boolean;
}

function SidebarItem({ item, pathname, depth, parentActive = false }: SidebarItemProps) {
  const { href, label, icon: Icon, children } = item;

  const hasChildren = Array.isArray(children) && children.length > 0;
  const hasActiveChild =
    hasChildren &&
    children!.some((child) =>
      child.href === '/admin'
        ? pathname === '/admin' || pathname === '/admin/'
        : pathname.startsWith(child.href),
    );

  const isFolder = hasChildren;
  const isActive =
    isFolder && hasActiveChild
      ? true
      : href === '/admin'
        ? pathname === '/admin' || pathname === '/admin/'
        : pathname.startsWith(href);

  const [open, setOpen] = useState(() => (hasChildren ? hasActiveChild : false));

  return (
    <div className="space-y-0.5">
      {hasChildren ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md text-sm h-9 px-3',
            'cursor-pointer select-none text-left',
            'text-[#9ca3af] hover:bg-muted/40',
            isActive &&
              'bg-[#111827] text-[#e5e7eb] font-semibold shadow-[0_0_0_1px_rgba(15,23,42,0.8)]',
          )}
          aria-current={isActive ? 'page' : undefined}
          aria-expanded={open}
        >
          <Folder className="h-4 w-4 shrink-0 text-[#9ca3af]" aria-hidden />
          <span className="truncate flex-1">{label}</span>
          <ChevronRight
            className={cn('h-3 w-3 text-[#4b5563] transition-transform', open && 'rotate-90')}
            aria-hidden
          />
        </button>
      ) : (
        <Link
          href={href}
          className={cn(
            'flex items-center gap-2 rounded-lg text-[13px] h-8',
            'hover:bg-muted/50 transition-colors duration-150',
            !isActive && !parentActive && (depth === 0 ? 'text-[#9ca3af]' : 'text-[#a3a3a3]'),
            !isActive && parentActive && 'text-[#e5e7eb]',
            isActive &&
              'bg-white/[0.06] text-white font-medium',
            depth > 0 ? 'pl-8 pr-3' : 'px-3',
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </Link>
      )}

      {hasChildren && open && (
        <div
          className={cn(
            'ml-2 border-l',
            isActive || hasActiveChild ? 'border-[#1f2933]' : 'border-[#262626]',
          )}
        >
          <div className="mt-1 space-y-0.5">
            {children!.map((child) => (
              <SidebarItem
                key={child.href}
                item={child}
                pathname={pathname}
                depth={depth + 1}
                parentActive={isActive || parentActive}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
