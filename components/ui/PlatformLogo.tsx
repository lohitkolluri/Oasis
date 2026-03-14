import { cn } from '@/lib/utils';

/**
 * Brandfetch CDN URLs (dark theme icons). Loaded via native <img> so the request
 * comes from the browser with the correct Referer header (required by Brandfetch).
 * Next.js Image would fetch server-side and get rejected.
 * @see https://docs.brandfetch.com/logo-api/guidelines
 */
const PLATFORM_LOGO: Record<string, string> = {
  blinkit:
    'https://cdn.brandfetch.io/idqFC5Rk0D/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1700856649486',
  zepto:
    'https://cdn.brandfetch.io/idmjhO-S03/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1772368259501',
};

const PLATFORM_COLOR: Record<string, string> = {
  zepto: '#7dd3fc',
  blinkit: '#f59e0b',
  swiggy: '#f97316',
  zomato: '#ef4444',
};

export interface PlatformLogoProps {
  platform: string | null | undefined;
  size?: number;
  className?: string;
  /** Show platform name as title/aria (recommended for accessibility) */
  showName?: boolean;
}

/**
 * Renders the platform logo (Zepto, Blinkit, etc.) for delivery partners.
 * Falls back to first letter + brand color when no logo asset exists.
 */
export function PlatformLogo({
  platform,
  size = 32,
  className,
  showName = true,
}: PlatformLogoProps) {
  const key = (platform ?? '').toLowerCase().trim();
  const logoSrc = key ? PLATFORM_LOGO[key] : null;
  const color = key ? PLATFORM_COLOR[key] ?? '#666' : '#555';
  const label = platform ?? 'Platform';
  const initial = key ? key.charAt(0).toUpperCase() : '—';

  if (logoSrc) {
    return (
      <span
        className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1e1e1e]', className)}
        title={showName ? label : undefined}
        aria-hidden={!showName}
        role={showName ? 'img' : undefined}
        aria-label={showName ? `${label} logo` : undefined}
      >
        {/* Native img so Brandfetch gets browser Referer; Next/Image fetches server-side and is rejected */}
        <img
          src={logoSrc}
          alt=""
          width={size}
          height={size}
          className="object-contain"
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg border text-xs font-semibold',
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}18`,
        borderColor: `${color}40`,
        color,
      }}
      title={showName ? label : undefined}
      aria-hidden={!showName}
      role={showName ? 'img' : undefined}
      aria-label={showName ? label : undefined}
    >
      {initial}
    </span>
  );
}
