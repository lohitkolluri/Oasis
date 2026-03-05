import Image from 'next/image';

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

const DICEBEAR_BASE = 'https://api.dicebear.com/7.x';

export function Avatar({ seed, size = 40, className = '' }: AvatarProps) {
  const url = `${DICEBEAR_BASE}/lorelei/svg?seed=${encodeURIComponent(seed)}`;
  return (
    <div
      className={`rounded-full overflow-hidden border-2 border-zinc-600/50 bg-zinc-800 shrink-0 ring-2 ring-emerald-500/20 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={url}
        alt="Avatar"
        width={size}
        height={size}
        className="object-cover w-full h-full"
        unoptimized
      />
    </div>
  );
}
