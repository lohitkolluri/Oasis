'use client';

import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { gooeyToast } from 'goey-toast';
import { cn } from '@/lib/utils';

interface CopyableIdProps {
  /** Full value to copy (e.g. UUID, claim id). */
  value: string;
  /** Optional prefix shown before truncated id (e.g. "ID "). */
  prefix?: string;
  /** Number of leading characters to show before ellipsis. Default 8. */
  length?: number;
  className?: string;
  /** Optional label for screen readers / title. */
  label?: string;
}

export function CopyableId({
  value,
  prefix = '',
  length = 8,
  className,
  label = 'Click to copy',
}: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      gooeyToast.success('Copied to clipboard', {
        description: value.length > 24 ? `${value.slice(0, 20)}…` : value,
      });
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    } catch {
      gooeyToast.error('Could not copy');
    }
  }, [value]);

  const display = value.length > length ? `${value.slice(0, length)}…` : value;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      className={cn(
        'group inline-flex items-center gap-1.5 font-mono text-[11px] text-[#9ca3af]',
        'hover:text-white transition-colors rounded px-1.5 py-0.5 -mx-1.5',
        'hover:bg-[#262626] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3fc]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0f0f0f]',
        className,
      )}
      aria-label={`${label}: ${value}`}
    >
      {prefix && <span className="text-[#555] font-sans">{prefix}</span>}
      <span className="tabular-nums">{display}</span>
      {copied ? (
        <Check className="h-3 w-3 text-[#22c55e] shrink-0" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 text-[#555] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden />
      )}
    </button>
  );
}
