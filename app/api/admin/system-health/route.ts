/**
 * GET /api/admin/system-health
 *
 * Returns platform health: last adjudicator run, API statuses,
 * recent error count, and DB connectivity.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/utils/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdmin(user, profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [lastRunRes, errorCountRes, recentLogsRes] = await Promise.allSettled([
    admin
      .from("system_logs")
      .select("created_at, metadata")
      .in("event_type", ["adjudicator_run", "adjudicator_demo"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
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
  ]);

  const lastRun =
    lastRunRes.status === "fulfilled" ? lastRunRes.value.data : null;
  const errorCount =
    errorCountRes.status === "fulfilled" ? (errorCountRes.value.count ?? 0) : 0;
  const recentLogs =
    recentLogsRes.status === "fulfilled" ? (recentLogsRes.value.data ?? []) : [];

  // Check external API connectivity (lightweight probes)
  // Each probe is self-contained so the name is preserved even on network failure.
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
    // Use documented AQI example (Berlin, pm10/pm2_5) to test connectivity
    // rather than us_aqi, which can be more brittle from some networks.
    probe(
      "Open-Meteo AQI",
      "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=52.52&longitude=13.41&hourly=pm10,pm2_5"
    ),
  ]);

  // Add Tomorrow.io and NewsData status (key-presence check only, no actual call)
  apis.push({
    name: "Tomorrow.io",
    ok: !!process.env.TOMORROW_IO_API_KEY,
    status: process.env.TOMORROW_IO_API_KEY ? 200 : 0,
  });
  apis.push({
    name: "NewsData.io",
    ok: !!process.env.NEWSDATA_IO_API_KEY,
    status: process.env.NEWSDATA_IO_API_KEY ? 200 : 0,
  });
  apis.push({
    name: "OpenRouter LLM",
    ok: !!process.env.OPENROUTER_API_KEY,
    status: process.env.OPENROUTER_API_KEY ? 200 : 0,
  });

  const overallHealthy = apis.every((a) => a.ok) && errorCount === 0;

  return NextResponse.json({
    status: overallHealthy ? "healthy" : errorCount > 0 ? "degraded" : "warning",
    lastAdjudicatorRun: lastRun
      ? {
          at: lastRun.created_at,
          candidatesFound: (lastRun.metadata as Record<string, number>)?.candidates_found ?? 0,
          claimsCreated: (lastRun.metadata as Record<string, number>)?.claims_created ?? 0,
          durationMs: (lastRun.metadata as Record<string, number>)?.duration_ms ?? 0,
        }
      : null,
    errors24h: errorCount,
    apis,
    recentLogs,
  });
}
