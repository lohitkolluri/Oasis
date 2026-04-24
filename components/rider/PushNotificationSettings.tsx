'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushNotificationSettings({ className }: { className?: string }) {
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const canUsePush =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  useEffect(() => {
    if (!canUsePush) return;
    setPermission(Notification.permission);

    let cancelled = false;
    (async () => {
      const res = await fetch('/api/notifications/push');
      const data = (await res.json().catch(() => ({}))) as {
        configured?: boolean;
        publicKey?: string | null;
      };
      if (cancelled) return;
      const ready = data.configured === true;
      setServerReady(ready);
      setPublicKey(typeof data.publicKey === 'string' ? data.publicKey : null);

      if (ready && Notification.permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUsePush]);

  const subscribe = useCallback(async () => {
    if (!publicKey || !serverReady) {
      toast.error('Push alerts are not available on this server yet.');
      return;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast.error('Notification permission denied.');
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe().catch(() => {});
      }
      const keyBytes = urlBase64ToUint8Array(publicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer.slice(
          keyBytes.byteOffset,
          keyBytes.byteOffset + keyBytes.byteLength,
        ) as ArrayBuffer,
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Browser did not return subscription keys');
      }
      const res = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          typeof errBody.error === 'string' ? errBody.error : 'Failed to save subscription',
        );
      }
      setSubscribed(true);
      toast.success('Push alerts enabled for this device.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not enable push');
    } finally {
      setLoading(false);
    }
  }, [publicKey, serverReady]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const json = sub.toJSON();
        await fetch('/api/notifications/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint }),
        });
        await sub.unsubscribe();
      } else {
        await fetch('/api/notifications/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }
      setSubscribed(false);
      toast.success('Push alerts turned off.');
    } catch {
      toast.error('Could not disable push.');
    } finally {
      setLoading(false);
    }
  }, []);

  const pushEnabled = canUsePush && serverReady === true && subscribed;
  const toggleDisabled = loading || permission === 'denied' || !canUsePush || serverReady !== true;

  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
        className,
      )}
    >
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
        <h2 className="text-[13px] font-semibold text-zinc-200 tracking-tight">Push alerts</h2>
        <button
          type="button"
          role="switch"
          aria-checked={pushEnabled}
          aria-label="Toggle push alerts"
          onClick={pushEnabled ? unsubscribe : subscribe}
          disabled={toggleDisabled}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50',
            pushEnabled
              ? 'border-uber-green/70 bg-uber-green/80'
              : 'border-white/15 bg-white/[0.08]',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-transform',
              pushEnabled ? 'translate-x-[22px]' : 'translate-x-0.5',
            )}
          />
          {loading || serverReady === null ? (
            <Loader2
              className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-black/70"
              aria-hidden
            />
          ) : null}
        </button>
      </div>
    </section>
  );
}
