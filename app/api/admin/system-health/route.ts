/**
 * GET /api/admin/system-health
 * Platform health: DB and optional Stripe reachability, last adjudicator run, API statuses. Admin-only.
 * Returns 503 when critical dependencies (Supabase) are unreachable.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAdminAuth } from "@/lib/utils/admin-guard";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

async function checkSupabase(admin: ReturnType<typeof createAdminClient>): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await admin.from("system_logs").select("id").limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Database unreachable" };
  }
}

async function checkStripe(): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { ok: true };
  try {
    const stripe = new Stripe(key);
    await stripe.balance.retrieve();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe unreachable" };
  }
}

export const GET = withAdminAuth(async () => {
  const admin = createAdminClient();

  const [dbCheck, stripeCheck, lastRunRes, errorCountRes, recentLogsRes, lastRotationRes, logCountRes] = await Promise.all([
    checkSupabase(admin),
    checkStripe(),
    admin
      .from("system_logs")
      .select("created_at, metadata, severity")
      .in("event_type", ["adjudicator_run", "adjudicator_demo"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("system_logs")
      .select("id", { count: "exact", head: true })
      .eq("severity", "error")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    admin
      .from("system_logs")
      .select("event_type, severity, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("system_logs")
      .select("created_at, metadata")
      .eq("event_type", "log_rotation")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("system_logs")
      .select("id", { count: "exact", head: true }),
  ]);

  const dbOk = dbCheck.ok;
  const stripeOk = stripeCheck.ok;
  const lastRun = lastRunRes.data;
  const errorCount = errorCountRes.error ? 0 : (errorCountRes.count ?? 0);
  const recentLogs = recentLogsRes.data ?? [];
  const lastRotation = lastRotationRes.data;
  const totalLogCount = logCountRes.count ?? 0;

  if (!dbOk) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Database unreachable",
        details: dbCheck.error,
      },
      { status: 503 },
    );
  }

  async function probe(name: string, url: string): Promise<{ name: string; ok: boolean; status: number }> {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return { name, ok: r.ok, status: r.status };
    } catch {
      return { name, ok: false, status: 0 };
    }
  }

  const apis = await Promise.all([
    probe(
      "Open-Meteo Weather",
      "https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&hourly=temperature_2m&forecast_days=1"
    ),
    probe(
      "Open-Meteo AQI",
      "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=52.52&longitude=13.41&hourly=pm10,pm2_5"
    ),
  ]);
  apis.push(
    { name: "Tomorrow.io", ok: !!process.env.TOMORROW_IO_API_KEY, status: process.env.TOMORROW_IO_API_KEY ? 200 : 0 },
    { name: "NewsData.io", ok: !!process.env.NEWSDATA_IO_API_KEY, status: process.env.NEWSDATA_IO_API_KEY ? 200 : 0 },
    { name: "OpenRouter LLM", ok: !!process.env.OPENROUTER_API_KEY, status: process.env.OPENROUTER_API_KEY ? 200 : 0 },
    { name: "Stripe", ok: stripeOk, status: stripeOk ? 200 : process.env.STRIPE_SECRET_KEY ? 0 : 200 },
  );

  const m = lastRun?.metadata as Record<string, unknown> | undefined;
  const overallHealthy = apis.every((a) => a.ok) && errorCount === 0;

  return NextResponse.json({
    status: overallHealthy ? "healthy" : errorCount > 0 ? "degraded" : "warning",
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
  });
});
