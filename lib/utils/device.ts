/**
 * Device checks for GPS and verification flows.
 * Zone verification and any rider-submitted GPS should only be accepted from
 * mobile devices for precise location (desktop GPS can be spoofed or inaccurate).
 */

/** User-agent pattern for mobile devices (phones, tablets) that have real GPS. */
const MOBILE_GPS_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i;

/**
 * Returns true if the given user agent appears to be a mobile device.
 * Use for: allowing GPS-based verification (claim verify, report delivery, onboarding zone).
 * Pass navigator.userAgent on client, or request.headers.get('user-agent') ?? '' on server.
 */
export function isMobileForGps(userAgent: string): boolean {
  if (!userAgent || typeof userAgent !== 'string') return false;
  return MOBILE_GPS_PATTERN.test(userAgent);
}
