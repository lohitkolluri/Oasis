'use client';

import {
  Activity,
  BarChart2,
  CreditCard,
  FileCheck,
  FlaskConical,
  LayoutDashboard,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navSections = [
  {
    label: 'Operations',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
      { href: '/admin/policies', label: 'Policies', icon: FileCheck },
      { href: '/admin/triggers', label: 'Triggers', icon: Zap },
      { href: '/admin/riders', label: 'Riders', icon: Users },
    ],
  },
  {
    label: 'Financial',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/admin/payments', label: 'Payments', icon: CreditCard },
    ],
  },
  {
    label: 'Review',
    items: [
      { href: '/admin/fraud', label: 'Fraud Queue', icon: ShieldAlert },
      { href: '/admin/health', label: 'System Health', icon: Activity },
      { href: '/admin/demo', label: 'Demo', icon: FlaskConical },
    ],
  },
];

export const adminNavItems = navSections.flatMap((s) => s.items);

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto">
      {navSections.map((section) => (
        <div key={section.label} className="mb-4 last:mb-0">
          <p className="px-3 pb-2 text-[10px] font-medium text-[#555] uppercase tracking-[0.12em]">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === '/admin'
                  ? pathname === '/admin' || pathname === '/admin/'
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-[#1e1e1e] text-white border-l-2 border-[#7dd3fc] pl-[10px]'
                      : 'text-[#737373] hover:text-white hover:bg-[#1e1e1e]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#7dd3fc]' : 'text-[#555] group-hover:text-white'
                    }`}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
