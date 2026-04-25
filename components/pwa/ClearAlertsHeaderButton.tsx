'use client';

import { useRiderI18n } from '@/components/rider/RiderI18nProvider';
import { dispatchBadgeRefresh } from '@/lib/pwa/badge-refresh';
import { Bell, Loader2, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

/**
 * Marks rider_notifications as read and refreshes the OS app badge.
 * Lives in the top bar beside the profile avatar.
 */
export function ClearAlertsHeaderButton() {
  const { messages } = useRiderI18n();
  const [loading, setLoading] = useState(false);

  const onClick = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rider/notifications/mark-read', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { marked?: number; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Could not update alerts');
        return;
      }
      const marked = data.marked ?? 0;
      toast.success(
        marked > 0 ? `Marked ${marked} alert(s) as read.` : 'No unread alerts to clear.',
      );
      dispatchBadgeRefresh();
    } catch {
      toast.error('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={messages.common.clearAlertsBadge}
      className="flex items-center justify-center w-9 h-9 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
    >
      {loading ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin text-zinc-400" aria-hidden />
      ) : (
        <span
          className="relative flex h-[20px] w-[20px] items-center justify-center shrink-0"
          aria-hidden
        >
          <Bell className="h-[17px] w-[17px] text-zinc-400" strokeWidth={1.75} />
          <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black ring-1 ring-white/15">
            <X className="h-2 w-2 text-uber-green" strokeWidth={3} />
          </span>
        </span>
      )}
    </button>
  );
}
