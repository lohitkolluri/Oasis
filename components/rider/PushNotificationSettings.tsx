'use client';

import { cn } from '@/lib/utils';
import { Bell, BellOff, Loader2 } from 'lucide-react';
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
        throw new Error(typeof errBody.error === 'string' ? errBody.error : 'Failed to save subscription');
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

  if (!canUsePush) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
          className,
        )}
      >
        <h2 className="text-[13px] font-semibold text-zinc-200 tracking-tight">Push alerts</h2>
        <p className="text-[12px] text-zinc-600 mt-1 leading-relaxed">
          Use a supported mobile browser and install Oasis (Add to Home Screen) for background notifications. In-app
          alerts still work while the app is open.
        </p>
      </section>
    );
  }

  if (serverReady === false) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
          className,
        )}
      >
        <h2 className="text-[13px] font-semibold text-zinc-200 tracking-tight">Push alerts</h2>
        <p className="text-[12px] text-zinc-600 mt-1 leading-relaxed">
          Server push is not configured. You will still get instant in-app toasts when Oasis is open.
        </p>
      </section>
    );
  }

  if (serverReady === null) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-center gap-3 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500 shrink-0" />
        <p className="text-[12px] text-zinc-500">Checking push support…</p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 rounded-xl p-2 shrink-0',
            subscribed ? 'bg-uber-green/15 text-uber-green' : 'bg-white/[0.04] text-zinc-500',
          )}
        >
          {subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[13px] font-semibold text-zinc-200 tracking-tight">Push alerts (PWA)</h2>
          <p className="text-[12px] text-zinc-600 mt-1 leading-relaxed">
            Get notified when you have a claim or need to verify location—even if the app is in the background. On
            iPhone, add Oasis to your Home Screen first (iOS 16.4+).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {subscribed ? (
              <button
                type="button"
                onClick={unsubscribe}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-medium text-zinc-200 min-h-[44px] hover:bg-white/[0.07] active:bg-white/[0.1] transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                Turn off push
              </button>
            ) : (
              <button
                type="button"
                onClick={subscribe}
                disabled={loading || permission === 'denied'}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-uber-green px-4 py-2.5 text-[12px] font-semibold text-black min-h-[44px] hover:bg-uber-green/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-black" aria-hidden /> : null}
                Enable push alerts
              </button>
            )}
          </div>
          {permission === 'denied' ? (
            <p className="text-[11px] text-amber-500/90 mt-2 leading-snug">
              Notifications are blocked in your browser settings. Enable them for this site to use push.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
