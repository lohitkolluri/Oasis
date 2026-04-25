/**
 * App Badging API (Chrome/Android; iOS 16.4+ for installed web apps).
 * No-op when unsupported.
 */
export function setAppBadgeFromCount(count: number): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & {
    setAppBadge?: (contents?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (typeof nav.clearAppBadge !== 'function' && typeof nav.setAppBadge !== 'function') {
    return;
  }
  if (!Number.isFinite(count) || count <= 0) {
    void nav.clearAppBadge?.();
    return;
  }
  const capped = Math.min(Math.floor(count), 99);
  void nav.setAppBadge?.(capped);
}
