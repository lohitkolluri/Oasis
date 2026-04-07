/**
 * Best-effort device fingerprint for abuse detection.
 *
 * NOTE: Web PWAs cannot access strong device attestation signals like Play Integrity.
 * This fingerprint is therefore a *soft* identifier to help detect velocity / duplicate abuse.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'server';

  const nav = window.navigator;
  const parts = [
    nav.userAgent ?? '',
    nav.language ?? '',
    // `platform` is deprecated but still present in most browsers; safe for soft fingerprinting.
    // eslint-disable-next-line deprecation/deprecation
    (nav as unknown as { platform?: string }).platform ?? '',
    String(nav.hardwareConcurrency ?? ''),
    String((window.screen?.width ?? '') + 'x' + (window.screen?.height ?? '')),
    String(window.devicePixelRatio ?? ''),
    String(new Date().getTimezoneOffset()),
  ].join('|');

  const enc = new TextEncoder();
  const data = enc.encode(parts);

  // Hash with SHA-256 via WebCrypto (supported in modern mobile browsers / PWAs).
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pwa_${hex.slice(0, 32)}`;
}

