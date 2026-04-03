'use client';

import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function Avatar({ seed, size = 40, className = '' }: AvatarProps) {
  const dataUri = useMemo(
    () => createAvatar(lorelei, { seed, size }).toDataUri(),
    [seed, size]
  );

  return (
    <div
      className={`rounded-full overflow-hidden border-2 border-zinc-600/50 bg-zinc-800 shrink-0 ring-2 ring-emerald-500/20 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={dataUri}
        alt="Avatar"
        width={size}
        height={size}
        className="block h-full w-full object-cover"
        decoding="async"
      />
    </div>
  );
}
