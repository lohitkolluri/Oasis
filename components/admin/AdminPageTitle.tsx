'use client';

import { InlineHelp } from '@/components/ui/inline-help';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export { InlineHelp as AdminInlineHelp };

type AdminPageTitleProps = {
  title: string;
  help: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
};

/**
 * Standard admin page heading with ? tooltip beside the title.
 */
export function AdminPageTitle({
  title,
  help,
  description,
  eyebrow,
  actions,
  className,
  titleClassName,
}: AdminPageTitleProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">{eyebrow}</span>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className={cn(
              'text-2xl font-semibold tracking-tight text-white',
              titleClassName,
            )}
          >
            {title}
          </h1>
          <InlineHelp text={help} />
        </div>
        {description ? (
          <p className="max-w-2xl text-sm text-[#666]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
