/**
 * Wraps external API calls to record latency and success/failure on parametric_source_health.
 */

import { mergeSourceHealth } from '@/lib/adjudicator/ledger';
import type { AdjudicatorInstrumentationContext } from '@/lib/adjudicator/types';

export async function probeSource<T>(
  ctx: AdjudicatorInstrumentationContext | undefined,
  sourceId: string,
  fn: () => Promise<T>,
  opts?: { isFallback?: boolean; fallbackOf?: string | null },
): Promise<T> {
  if (!ctx) return fn();

  const t0 = Date.now();
  const observedAt = new Date().toISOString();
  try {
    const v = await fn();
    await mergeSourceHealth(ctx.supabase, sourceId, {
      ok: true,
      latencyMs: Date.now() - t0,
      observedAt,
      isFallback: opts?.isFallback,
      fallbackOf: opts?.fallbackOf,
    });
    return v;
  } catch (err) {
    await mergeSourceHealth(ctx.supabase, sourceId, {
      ok: false,
      latencyMs: Date.now() - t0,
      observedAt,
      errorDetail: err instanceof Error ? err.message : String(err),
      isFallback: opts?.isFallback,
      fallbackOf: opts?.fallbackOf,
    });
    throw err;
  }
}
