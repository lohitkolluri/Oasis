import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Dark-surface skeleton block with horizontal shimmer (see `.rider-sk` in globals.css). */
export function RiderSk({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div role="presentation" aria-hidden className={cn('rider-sk', className)} {...props} />
  );
}
