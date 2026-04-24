/**
 * GET /api/admin/system-health
 * Platform health: DB and optional Razorpay reachability, last adjudicator run, API statuses. Admin-only.
 * Returns 503 when critical dependencies (Supabase) are unreachable.
 */

import { mergeSourceHealth } from '@/lib/adjudicator/ledger';
import {
  getExpectedParametricSourceIds,
  getPinnedParametricSourceIds,
  shouldKeepSourceHealthRow,
} from '@/lib/adjudicator/source-health-registry';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

async function checkSupabase(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await admin.from('system_logs').select('id').limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database unreachable' };
  }
}

async function checkRazorpay(): Promise<{ ok: boolean; error?: string }> {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId && !secret) return { ok: true };
  if (!keyId?.startsWith('rzp_test_')) {
    return { ok: false, error: 'NEXT_PUBLIC_RAZORPAY_KEY_ID must be a test key (rzp_test_...)' };
  }
  if (!secret) return { ok: false, error: 'RAZORPAY_KEY_SECRET not set' };
  try {
    const { getRazorpayInstance } = await import('@/lib/clients/razorpay');
    const rzp = getRazorpayInstance();
    await rzp.orders.all({ count: 1 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Razorpay unreachable' };
  }
}

export const GET = withAdminAuth(async () => {
  const admin = createAdminClient();

  // Ensure RSS fallbacks appear in parametric source health even when unused.
  async function touchHttpSource(sourceId: string, url: string): Promise<void> {
    const t0 = Date.now();
    const observedAt = new Date().toISOString();
    try {
      const r = await fetch(url, {
        headers: {
          Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
        },
        signal: AbortSignal.timeout(5000),
      });
      await mergeSourceHealth(admin, sourceId, {
        ok: r.ok,
        latencyMs: Date.now() - t0,
        observedAt,
        ...(r.ok ? {} : { errorDetail: `HTTP ${r.status}` }),
      });
    } catch (e) {
      await mergeSourceHealth(admin, sourceId, {
        ok: false,
        latencyMs: Date.now() - t0,
        observedAt,
        errorDetail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const [dbCheck, razorpayCheck] = await Promise.all([checkSupabase(admin), checkRazorpay()]);

  // IMPORTANT: touch TOI rows first, then read `parametric_source_health`.
  // Otherwise the SELECT can race ahead and the UI won't show TOI rows until the next refresh.
  await Promise.all([
    touchHttpSource(
      'toi_rss_top_stories',
      'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    ),
    touchHttpSource(
      'toi_rss_india',
      'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
    ),
  ]);

  const [
    lastRunRes,
    errorCountRes,
    recentLogsRes,
    lastRotationRes,
    logCountRes,
    parametricSourcesRes,
    parametricLedgerRes,
  ] = await Promise.all([
    admin
      .from('system_logs')
      .select('created_at, metadata, severity')
      .in('event_type', ['adjudicator_run', 'adjudicator_demo'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('system_logs')
      .select('id', { count: 'exact', head: true })
      .eq('severity', 'error')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    admin
      .from('system_logs')
      .select('event_type, severity, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('system_logs')
      .select('created_at, metadata')
      .eq('event_type', 'log_rotation')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Bound the count to the active retention window: a full-table exact count on
    // `system_logs` is run on every health poll and gets expensive at volume; 30d is
    // the rotation window per LOG_ROTATION.SYSTEM_LOGS_DAYS.
    admin
      .from('system_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    admin
      .from('parametric_source_health')
      .select(
        'source_id,last_success_at,last_error_at,last_error_detail,last_observed_at,error_streak,success_streak,avg_latency_ms,last_latency_ms,is_fallback,fallback_of',
      )
      .order('source_id', { ascending: true }),
    admin
      .from('parametric_trigger_ledger')
      .select('id,created_at,source,outcome,rule_version,trigger_subtype,is_dry_run,claims_created')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const dbOk = dbCheck.ok;
  const razorpayOk = razorpayCheck.ok;
  const lastRun = lastRunRes.data;
  const errorCount = errorCountRes.error ? 0 : (errorCountRes.count ?? 0);
  const recentLogs = recentLogsRes.data ?? [];
  const lastRotation = lastRotationRes.data;
  const totalLogCount = logCountRes.count ?? 0;
  const expectedIds = getExpectedParametricSourceIds();
  const pinnedIds = getPinnedParametricSourceIds();
  const parametricSourcesRaw = parametricSourcesRes.error ? [] : (parametricSourcesRes.data ?? []);
  const parametricSources = parametricSourcesRaw.filter((r) =>
    shouldKeepSourceHealthRow({
      sourceId: r.source_id,
      lastObservedAt: r.last_observed_at,
      expectedIds,
      pinnedIds,
      keepObservedWithinDays: 30,
    }),
  );
  const parametricLedgerPreview = parametricLedgerRes.error ? [] : (parametricLedgerRes.data ?? []);

  if (!dbOk) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Database unreachable',
        details: dbCheck.error,
      },
      { status: 503 },
    );
  }

  async function probe(
    name: string,
    url: string,
  ): Promise<{ name: string; ok: boolean; status: number }> {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return { name, ok: r.ok, status: r.status };
    } catch {
      return { name, ok: false, status: 0 };
    }
  }

  const apis = await Promise.all([
    probe(
      'Open-Meteo forecast',
      'https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&hourly=temperature_2m&forecast_days=1',
    ),
    probe(
      'Open-Meteo AQI',
      'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=52.52&longitude=13.41&hourly=pm10,pm2_5',
    ),
  ]);

  if (expectedIds.has('tomorrow_io')) {
    apis.push({
      name: 'Tomorrow.io',
      ok: !!process.env.TOMORROW_IO_API_KEY,
      status: process.env.TOMORROW_IO_API_KEY ? 200 : 0,
    });
  }
  if (expectedIds.has('newsdata_io_traffic') || expectedIds.has('newsdata_io_curfew')) {
    apis.push({
      name: 'NewsData.io',
      ok: !!process.env.NEWSDATA_IO_API_KEY,
      status: process.env.NEWSDATA_IO_API_KEY ? 200 : 0,
    });
  }
  if (
    expectedIds.has('openrouter_toi_traffic') ||
    expectedIds.has('openrouter_toi_curfew') ||
    expectedIds.has('openrouter_news_traffic') ||
    expectedIds.has('openrouter_news_curfew')
  ) {
    apis.push({
      name: 'OpenRouter LLM',
      ok: !!process.env.OPENROUTER_API_KEY,
      status: process.env.OPENROUTER_API_KEY ? 200 : 0,
    });
  }
  if (expectedIds.has('tomtom_traffic')) {
    apis.push({
      name: 'TomTom traffic',
      ok: !!process.env.TOMTOM_API_KEY,
      status: process.env.TOMTOM_API_KEY ? 200 : 0,
    });
  }
  if (expectedIds.has('waqi_ground_station')) {
    apis.push({
      name: 'WAQI ground station',
      ok: !!process.env.WAQI_API_KEY,
      status: process.env.WAQI_API_KEY ? 200 : 0,
    });
  }
  apis.push({
    name: 'Razorpay',
    ok: razorpayOk,
    status: razorpayOk ? 200 : process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? 0 : 200,
  });

  const m = lastRun?.metadata as Record<string, unknown> | undefined;
  const overallHealthy = apis.every((a) => a.ok) && errorCount === 0;

  return NextResponse.json({
    status: overallHealthy ? 'healthy' : errorCount > 0 ? 'degraded' : 'warning',
    lastAdjudicatorRun: lastRun
      ? {
          runId: m?.run_id ?? null,
          at: lastRun.created_at,
          severity: lastRun.severity,
          candidatesFound: (m?.candidates_found as number) ?? 0,
          claimsCreated: (m?.claims_created as number) ?? 0,
          payoutsInitiated: (m?.payouts_initiated as number) ?? 0,
          durationMs: (m?.duration_ms as number) ?? 0,
          error: (m?.error as string) ?? null,
          payoutFailures: (m?.payout_failures as number) ?? null,
          logFailures: (m?.log_failures as number) ?? null,
        }
      : null,
    errors24h: errorCount,
    logRotation: {
      lastRunAt: lastRotation?.created_at ?? null,
      lastResult: lastRotation?.metadata ?? null,
      totalLogRows: totalLogCount,
    },
    apis,
    recentLogs,
    parametric: {
      sources: parametricSources,
      recentLedger: parametricLedgerPreview,
      ledgerError: parametricLedgerRes.error?.message ?? null,
      sourcesError: parametricSourcesRes.error?.message ?? null,
    },
  });
});
