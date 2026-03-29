'use client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

type Props = {
  targetWeekStart: string;
  /** Parent renders feedback below the header; `null` clears */
  onJobComplete?: (payload: { ok: boolean; message: string } | null) => void;
};

export function GeneratePremiumForecastButton({ targetWeekStart, onJobComplete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const run = useCallback(async () => {
    setStatus('loading');
    onJobComplete?.(null);
    try {
      const res = await fetch('/api/admin/run-weekly-premium', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        processed?: number;
        zonesDeduped?: number;
        week_start_date?: string;
      };
      if (!res.ok) {
        setStatus('error');
        const msg = data.error ?? `Request failed (${res.status})`;
        onJobComplete?.({ ok: false, message: msg });
        return;
      }
      setStatus('idle');
      const wk = data.week_start_date;
      const msg =
        data.processed === 0
          ? `No profiles with platform set — add platform on rider profiles first.${wk ? ` (target week ${wk})` : ''}`
          : wk
            ? `DB week ${wk}: ${data.processed} profile${data.processed === 1 ? '' : 's'} · ${data.zonesDeduped ?? 0} zone cluster${(data.zonesDeduped ?? 0) === 1 ? '' : 's'}`
            : `Updated ${data.processed} profile${data.processed === 1 ? '' : 's'} · ${data.zonesDeduped ?? 0} zone cluster${(data.zonesDeduped ?? 0) === 1 ? '' : 's'}`;
      onJobComplete?.({ ok: true, message: msg });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setStatus('error');
      onJobComplete?.({ ok: false, message: 'Network error' });
    }
  }, [router, onJobComplete]);

  const loading = status === 'loading' || isPending;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      onClick={run}
      title={`Run model for enrollment week starting ${targetWeekStart} (IST)`}
      className={cn(
        'h-[2.125rem] min-h-[2.125rem] gap-2 rounded-lg px-3.5 text-[11px] font-semibold tracking-wide shrink-0',
        'border-emerald-500/35 bg-emerald-950/35 text-emerald-100/95',
        'shadow-[0_0_24px_-10px_rgba(16,185,129,0.45)]',
        'hover:bg-emerald-900/45 hover:border-emerald-400/40 hover:text-white',
        'focus-visible:ring-emerald-500/30',
        'disabled:opacity-55',
      )}
    >
      {loading ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-emerald-300/90" aria-hidden />
      ) : (
        <Sparkles className="size-3.5 shrink-0 text-emerald-400/95" aria-hidden />
      )}
      <span className="tabular-nums whitespace-nowrap">{loading ? 'Running…' : 'Generate forecast'}</span>
    </Button>
  );
}
