'use client';

import { FileCheck, FileWarning, MoreHorizontal, Shield } from 'lucide-react';
import Link from 'next/link';

const actions = [
  {
    href: '/dashboard',
    label: 'Report impact',
    icon: FileWarning,
    iconBg: 'bg-amber-500/12 text-amber-400 group-hover:bg-amber-500/20 group-hover:text-amber-300',
    ariaLabel: 'Report delivery impact',
  },
  {
    href: '/dashboard/claims',
    label: 'Claims',
    icon: FileCheck,
    iconBg: 'bg-violet-500/12 text-violet-400 group-hover:bg-violet-500/20 group-hover:text-violet-300',
    ariaLabel: 'View claims history',
  },
  {
    href: '/dashboard/policy',
    label: 'Policy',
    icon: Shield,
    iconBg: 'bg-uber-green/12 text-uber-green group-hover:bg-uber-green/20 group-hover:text-uber-green',
    ariaLabel: 'View policy',
  },
  {
    href: '/dashboard',
    label: 'More',
    icon: MoreHorizontal,
    iconBg: 'bg-zinc-500/12 text-zinc-400 group-hover:bg-zinc-500/20 group-hover:text-zinc-300',
    ariaLabel: 'More options',
  },
] as const;

export function WalletActions() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map(({ href, label, icon: Icon, iconBg, ariaLabel }) => (
        <Link
          key={label}
          href={href}
          aria-label={ariaLabel}
          className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#0c0c0c] py-4 px-2 hover:bg-surface-2 hover:border-white/15 transition-all active:scale-[0.95] min-h-[88px] justify-center"
        >
          <span className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all ${iconBg} group-hover:scale-105`}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-[11px] font-medium text-zinc-400 text-center leading-tight group-hover:text-zinc-300 transition-colors">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
