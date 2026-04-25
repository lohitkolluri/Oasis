'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const SYNC_TAG = 'oasis-client-refresh';
const PERIODIC_TAG = 'oasis-periodic-refresh';

/**
 * Android-first: registers Background Sync / Periodic Background Sync when available.
 * The custom service worker (`worker/index.ts`) notifies clients so we can refresh
 * server components and badge counts. iOS support is limited or absent.
 */
export function PwaBackgroundSync() {
  const router = useRouter();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const tryRegister = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const syncMgr = (
          reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }
        ).sync;
        if (syncMgr?.register) {
          await syncMgr.register(SYNC_TAG);
        }
      } catch {
        // denied / unsupported
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const periodic = (
          reg as ServiceWorkerRegistration & {
            periodicSync?: {
              register: (tag: string, opts: { minInterval: number }) => Promise<void>;
            };
          }
        ).periodicSync;
        if (!periodic?.register) return;
        const perm = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        if (perm.state !== 'granted') return;
        await periodic.register(PERIODIC_TAG, { minInterval: 12 * 60 * 60 * 1000 });
      } catch {
        // unsupported or not granted
      }
    };

    void tryRegister();

    const onOnline = () => {
      void tryRegister();
    };
    window.addEventListener('online', onOnline);

    const onMessage = (event: MessageEvent) => {
      const t = event.data?.type;
      if (t === 'OASIS_BG_SYNC' || t === 'OASIS_PERIODIC_SYNC') {
        window.dispatchEvent(new CustomEvent('oasis:pwa-bg-sync'));
        router.refresh();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('online', onOnline);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, [router]);

  return null;
}
