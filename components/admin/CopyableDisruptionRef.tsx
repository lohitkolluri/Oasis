'use client';

import { CopyableId } from '@/components/ui/CopyableId';

export function CopyableDisruptionRef({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  return (
    <CopyableId
      value={id}
      prefix=""
      length={8}
      label="Copy disruption event id"
      className={`font-mono text-[11px] text-[#9ca3af] hover:text-[#3ECF8E] ${className ?? ''}`}
    />
  );
}
