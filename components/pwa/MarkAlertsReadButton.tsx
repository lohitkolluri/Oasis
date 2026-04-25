'use client';

import { Button } from '@/components/ui/Button';
import { dispatchBadgeRefresh } from '@/lib/pwa/badge-refresh';
import { BellOff, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

/**
 * Marks in-app rider notifications as read (sets read_at), then refreshes the OS app badge.
 * The badge can still show a count while a payout needs GPS verification — that clears after verify.
 */
export function MarkAlertsReadButton() {
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
    <div className="rounded-2xl border border-white/10 bg-surface-1 p-4 space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
          <BellOff className="h-5 w-5 text-zinc-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white">Home screen badge</p>
          <p className="mt-1 text-[12px] text-zinc-500 leading-relaxed">
            Tap below to mark in-app payout and disruption alerts as read. If a payout still needs
            location verification, the badge may stay until you complete verify on Claims.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={loading}
        onClick={onClick}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Updating…
          </>
        ) : (
          'Mark alerts read & refresh badge'
        )}
      </Button>
    </div>
  );
}
