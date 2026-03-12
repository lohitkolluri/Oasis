'use client';

import { FileCheck, FileWarning, MoreHorizontal, Shield } from 'lucide-react';
import Link from 'next/link';

const actions = [
  {
    href: '/dashboard',
    label: 'Report impact',
    icon: FileWarning,
    ariaLabel: 'Report delivery impact',
  },
  {
    href: '/dashboard/claims',
    label: 'Claims',
    icon: FileCheck,
    ariaLabel: 'View claims history',
  },
  {
    href: '/dashboard/policy',
    label: 'Policy',
    icon: Shield,
    ariaLabel: 'View policy',
  },
  {
    href: '/dashboard',
    label: 'More',
    icon: MoreHorizontal,
    ariaLabel: 'More options',
  },
] as const;

export function WalletActions() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map(({ href, label, icon: Icon, ariaLabel }) => (
        <Link
          key={label}
          href={href}
          aria-label={ariaLabel}
          className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-surface-1/80 py-4 px-2 hover:bg-surface-2 hover:border-white/15 transition-all active:scale-[0.95] active:bg-surface-2 min-h-[88px] justify-center"
        >
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white/90">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-[11px] font-semibold text-zinc-400 text-center leading-tight">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
