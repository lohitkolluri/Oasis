'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const VIEWS = [
  { href: '/admin/health/api', label: 'API Health' },
  { href: '/admin/health/logs', label: 'System Logs' },
];

export function SystemHealthSwitcher() {
  const pathname = usePathname();

  return (
    <div className="mt-3 space-y-1">
      <p className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">
        System Health Views
      </p>
      <div className="inline-flex rounded-md border border-[#262626] bg-[#050505] p-0.5">
        {VIEWS.map((view, index) => {
          const active = pathname === view.href;
          return (
            <Link
              key={view.href}
              href={view.href}
              className={cn(
                'px-3 py-1 text-[11px] font-medium transition-colors',
                'first:rounded-l-[6px] last:rounded-r-[6px]',
                index > 0 && 'border-l border-[#1f2933]/40',
                active
                  ? 'bg-[#1f2933] text-white'
                  : 'text-[#9ca3af] hover:bg-[#111111] hover:text-[#e5e7eb]',
              )}
            >
              {view.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

