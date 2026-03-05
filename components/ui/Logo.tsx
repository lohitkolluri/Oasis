import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

/** Logo with unoptimized to preserve PNG transparency. */
export function Logo({ size = 32, className = '', priority = false }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Oasis"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      unoptimized
      priority={priority}
    />
  );
}
