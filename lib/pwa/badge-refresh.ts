/** Dispatched after marking in-app alerts read so `RiderAppBadgeSync` recomputes the OS badge. */
export const OASIS_BADGE_REFRESH_EVENT = 'oasis:badge-refresh';

export function dispatchBadgeRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OASIS_BADGE_REFRESH_EVENT));
}
