'use client';

import { ChevronDown, FileText, HelpCircle, ShieldQuestion } from 'lucide-react';
import Link from 'next/link';
import { useRiderI18n } from './RiderI18nProvider';

const links = [
  {
    href: '/dashboard/policy/docs',
    labelKey: 'policyDocs',
    sublabelKey: 'termsCoverage',
    icon: FileText,
    iconBg: 'bg-sky-500/12 text-sky-400 group-hover:bg-sky-500/20',
  },
  {
    href: '/policy-summary',
    labelKey: 'coverageFaq',
    sublabelKey: 'whatsCovered',
    icon: ShieldQuestion,
    iconBg: 'bg-uber-green/12 text-uber-green group-hover:bg-uber-green/20',
  },
  {
    href: 'mailto:lohitkolluri@gmail.com',
    labelKey: 'helpSupport',
    sublabelKey: 'getInTouch',
    icon: HelpCircle,
    iconBg: 'bg-amber-500/12 text-amber-400 group-hover:bg-amber-500/20',
    external: true,
  },
] as const;

export function QuickLinks() {
  const { messages } = useRiderI18n();

  return (
    <details className="group rounded-2xl border border-white/10 bg-surface-1 overflow-hidden open:pb-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors [&::-webkit-details-marker]:hidden">
        <span className="text-[12px] font-medium text-zinc-500">
          {messages.dashboard.helpPolicyLinks}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-600 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
        {links.map(({ href, labelKey, sublabelKey, icon: Icon, iconBg, ...rest }) => {
          const isExternal = 'external' in rest && rest.external;
          const Component = isExternal ? 'a' : Link;
          const extraProps = isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {};
          const label = messages.dashboard[labelKey];
          const sublabel = messages.dashboard[sublabelKey];

          return (
            <Component
              key={label}
              href={href}
              {...(extraProps as Record<string, string>)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 active:scale-[0.99] transition-all group min-h-[52px]"
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0 ${iconBg}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-zinc-200 truncate">{label}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{sublabel}</p>
              </div>
            </Component>
          );
        })}
      </div>
    </details>
  );
}
