// @ts-nocheck — Supabase Edge Functions run in Deno; IDE uses Node/TS config
import { createClient } from "@supabase/supabase-js";

/**
 * Enterprise Adjudicator — Supabase Edge Function
 * Mirrors lib/adjudicator/run.ts but runs as a Deno edge function.
 *
 * Improvements:
 *  - Dynamic zone discovery: queries active rider zones instead of hardcoded Bangalore
 *  - Zone clustering: groups riders within ~10 km to avoid duplicate API calls
 *  - AQI trigger threshold 201 (US EPA "Very Unhealthy")
 *  - Payout amount from plan_packages.payout_per_claim_inr
 *  - Enforces plan max_claims_per_week per policy
 *  - System logging to system_logs table
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const LLM_MODEL = "meta-llama/llama-3.1-8b-instruct:free";
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

interface DisruptionCandidate {
  type: "weather" | "traffic" | "social";
  severity: number;
  geofence?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

function isWithinCircle(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  const R = 6371;
  const dLat = ((centerLat - pointLat) * Math.PI) / 180;
  const dLng = ((centerLng - pointLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((pointLat * Math.PI) / 180) *
      Math.cos((centerLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radiusKm;
}

function currentWeekMonday(): string {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysFromMonday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function checkDuplicate(sb: any, policyId: string, eventId: string): Promise<boolean> {
  const { data } = await sb
    .from("parametric_claims")
    .select("id")
    .eq("policy_id", policyId)
    .eq("disruption_event_id", eventId)
    .limit(1);
  return (data ?? []).length > 0;
}

async function checkRapidClaims(sb: any, policyId: string): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - 24);
  const { count } = await sb
    .from("parametric_claims")
    .select("id", { count: "exact", head: true })
    .eq("policy_id", policyId)
    .gte("created_at", windowStart.toISOString());
  return (count ?? 0) >= 5;
}

function checkWeatherMismatch(raw: Record<string, unknown> | null): boolean {
  if (!raw?.trigger) return false;
  const t = raw.trigger as string;
  if (t === "extreme_heat") {
    const d = raw.data as { values?: { temperature?: number } } | undefined;
    const temp = d?.values?.temperature ?? raw.temperature;
    if (temp != null && typeof temp === "number" && temp < 40) return true;
  }
  if (t === "heavy_rain") {
    const d = raw.data as { values?: { precipitationIntensity?: number } } | undefined;
    const p = d?.values?.precipitationIntensity ?? raw.precipitationIntensity;
    if (p != null && typeof p === "number" && p < 3) return true;
  }
  if (t === "severe_aqi") {
    // Adaptive: validate against the stored adaptive_threshold, not a fixed number
    const currentAqi = (raw.current_aqi as number | undefined) ??
      ((raw.hourly as { us_aqi?: (number | null)[] } | undefined)?.us_aqi ?? [])
        .find((v: number | null) => v != null);
    const adaptiveThreshold = (raw.adaptive_threshold as number | undefined) ?? 201;
    if (currentAqi != null && typeof currentAqi === "number" && currentAqi < adaptiveThreshold * 0.8) return true;
  }
  return false;
}

/** Round to 1 decimal (~11 km grid) to cluster nearby zones */
function clusterKey(lat: number, lng: number): string {
  return `${Math.round(lat * 10) / 10},${Math.round(lng * 10) / 10}`;
}

/** Get distinct active zone clusters from profiles with active policies */
async function getActiveZones(supabase: any): Promise<Array<{ lat: number; lng: number }>> {
  const today = new Date().toISOString().split("T")[0];
  const { data: activePolicies } = await supabase
    .from("weekly_policies")
    .select("profile_id")
    .eq("is_active", true)
    .lte("week_start_date", today)
    .gte("week_end_date", today);

  if (!activePolicies || activePolicies.length === 0) {
    return [{ lat: DEFAULT_LAT, lng: DEFAULT_LNG }];
  }

  const profileIds = [...new Set(activePolicies.map((p: any) => p.profile_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("zone_latitude, zone_longitude")
    .in("id", profileIds)
    .not("zone_latitude", "is", null)
    .not("zone_longitude", "is", null);

  if (!profiles || profiles.length === 0) return [{ lat: DEFAULT_LAT, lng: DEFAULT_LNG }];

  const seen = new Map<string, { lat: number; lng: number }>();
  for (const p of profiles) {
    if (p.zone_latitude == null || p.zone_longitude == null) continue;
    const key = clusterKey(p.zone_latitude, p.zone_longitude);
    if (!seen.has(key)) seen.set(key, { lat: p.zone_latitude, lng: p.zone_longitude });
  }
  return seen.size > 0 ? Array.from(seen.values()) : [{ lat: DEFAULT_LAT, lng: DEFAULT_LNG }];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const startMs = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tomorrowKey = Deno.env.get("TOMORROW_IO_API_KEY");
    const newsDataKey = Deno.env.get("NEWSDATA_IO_API_KEY");
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get distinct active zones
    const zones = await getActiveZones(supabase);
    const allCandidates: DisruptionCandidate[] = [];

    for (const zone of zones) {
      const { lat: LAT, lng: LNG } = zone;
      const candidates: DisruptionCandidate[] = [];

    // ── 1. Heat (Open-Meteo forecast → Tomorrow.io fallback) ────────────────
    let heat3h = false;
    let heatRaw: Record<string, unknown> = {};
    let precip = 0;
    let precipRaw: Record<string, unknown> = {};

    try {
      const forecastRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&hourly=temperature_2m&past_hours=24&forecast_hours=0&timeformat=iso8601`
      );
      if (forecastRes.ok) {
        const forecast = await forecastRes.json();
        const times = forecast.hourly?.time ?? [];
        const temps = forecast.hourly?.temperature_2m ?? [];
        const now = new Date();
        const last3: number[] = [];
        for (let i = times.length - 1; i >= 0 && last3.length < 3; i--) {
          if (new Date(times[i]) <= now) {
            const v = temps[i];
            if (v != null && typeof v === "number") last3.push(v);
          }
        }
        if (last3.length >= 3 && last3.every((v: number) => v >= 43)) {
          heat3h = true;
          heatRaw = { ...forecast, trigger: "extreme_heat", source: "openmeteo_forecast" };
        }
      }
    } catch { /* fall through */ }

    if (!heat3h && tomorrowKey) {
      const [res, forecastRes] = await Promise.all([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${LAT},${LNG}&apikey=${tomorrowKey}`),
        fetch(`https://api.tomorrow.io/v4/weather/forecast?location=${LAT},${LNG}&timesteps=1h&apikey=${tomorrowKey}`),
      ]);
      if (res.ok) {
        const data = await res.json();
        heatRaw = data;
        precipRaw = data;
        const temp = data.data?.values?.temperature ?? 0;
        precip = data.data?.values?.precipitationIntensity ?? 0;
        if (temp >= 43 && forecastRes.ok) {
          try {
            const f = await forecastRes.json();
            const hourly = f.timelines?.hourly ?? [];
            let streak = 0;
            for (const interval of hourly) {
              const t = interval.values?.temperature ?? 0;
              streak = t >= 43 ? streak + 1 : 0;
              if (streak >= 3) break;
            }
            heat3h = streak >= 3;
          } catch { heat3h = temp >= 43; }
        }
      }
    }

    if (heat3h) candidates.push({ type: "weather", severity: 8, geofence: { type: "circle", lat: LAT, lng: LNG, radius_km: 5 }, raw: heatRaw });
    if (tomorrowKey && precip >= 4) candidates.push({ type: "weather", severity: 7, geofence: { type: "circle", lat: LAT, lng: LNG, radius_km: 5 }, raw: { ...precipRaw, trigger: "heavy_rain" } });

    // ── 2. AQI — Adaptive threshold (zone-relative anomaly detection) ───────
    //  Fixed thresholds fail in India: Delhi baseline ~250–300, so AQI ≥ 201
    //  would trigger daily. Bangalore baseline ~60–80, so 201 almost never fires.
    //  Solution: compute 30-day p75 as the zone's "normal", trigger at +40% above it.
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startDate = thirtyDaysAgo.toISOString().split("T")[0];
      const endDate = today.toISOString().split("T")[0];

      const [historicalRes, currentRes] = await Promise.all([
        fetch(`https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LNG}&hourly=us_aqi&start_date=${startDate}&end_date=${endDate}`),
        fetch(`https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LNG}&current=us_aqi&hourly=us_aqi`),
      ]);

      if (historicalRes.ok && currentRes.ok) {
        const historical = await historicalRes.json();
        const currentData = await currentRes.json();

        const historicalValues: number[] = (historical.hourly?.us_aqi ?? []).filter(
          (v: number | null) => v != null && v > 0
        );
        const currentAqi: number =
          currentData.current?.us_aqi ??
          (currentData.hourly?.us_aqi ?? []).find((v: number | null) => v != null) ??
          0;

        let adaptiveThreshold = 201;
        let baseline75 = 0;
        let baselineMean = 0;

        if (historicalValues.length >= 48) {
          const sorted = [...historicalValues].sort((a: number, b: number) => a - b);
          baseline75 = sorted[Math.floor(sorted.length * 0.75)];
          baselineMean = Math.round(historicalValues.reduce((s: number, v: number) => s + v, 0) / historicalValues.length);
          adaptiveThreshold = Math.min(400, Math.max(150, Math.round(baseline75 * 1.4)));
        }

        if (currentAqi >= adaptiveThreshold) {
          const excessRatio = baseline75 > 0 ? (currentAqi - baseline75) / baseline75 : 0;
          const severity = Math.min(10, Math.max(6, Math.round(6 + excessRatio * 8)));
          candidates.push({
            type: "weather",
            severity,
            geofence: { type: "circle", lat: LAT, lng: LNG, radius_km: 15 },
            raw: {
              trigger: "severe_aqi",
              current_aqi: currentAqi,
              adaptive_threshold: adaptiveThreshold,
              baseline_p75: baseline75,
              baseline_mean: baselineMean,
              historical_days: Math.round(historicalValues.length / 24),
              excess_percent: Math.round(((currentAqi - baseline75) / Math.max(1, baseline75)) * 100),
              source: "openmeteo_adaptive",
            },
          });
        }
      }
    } catch { /* skip */ }

    // ── 3 & 4. Traffic + Social (NewsData + LLM) ─────────────────────────────
    if (newsDataKey && openRouterKey) {
      const trafficRes = await fetch(`https://newsdata.io/api/1/news?apikey=${newsDataKey}&q=traffic%20OR%20gridlock%20OR%20road%20closure&country=in&language=en&limit=3`);
      if (trafficRes.ok) {
        const trafficData = await trafficRes.json();
        const articles = trafficData.results ?? [];
        if (articles.length > 0) {
          const llmRes = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${openRouterKey}` },
            body: JSON.stringify({
              model: LLM_MODEL,
              messages: [{ role: "user", content: `Do any of these headlines indicate severe traffic gridlock affecting delivery work in India? Reply JSON only: {"qualifies":true/false,"severity":0-10}. Headlines: ${articles.map((a: { title?: string }) => a.title).join("; ")}` }],
            }),
          });
          if (llmRes.ok) {
            const llmData = await llmRes.json();
            const content = llmData.choices?.[0]?.message?.content ?? "{}";
            const m = content.match(/\{[\s\S]*\}/);
            if (m) {
              try {
                const p = JSON.parse(m[0]);
                if (p.qualifies && (p.severity ?? 0) >= 6) {
                  candidates.push({ type: "traffic", severity: p.severity ?? 7, geofence: { type: "circle", lat: LAT, lng: LNG, radius_km: 10 }, raw: { articles, llm: p, trigger: "traffic_gridlock" } });
                }
              } catch { /* skip */ }
            }
          }
        }
      }

      const newsRes = await fetch(`https://newsdata.io/api/1/news?apikey=${newsDataKey}&q=curfew%20OR%20strike%20OR%20lockdown&country=in&language=en&limit=3`);
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        const articles = newsData.results ?? [];
        if (articles.length > 0) {
          const llmRes = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${openRouterKey}` },
            body: JSON.stringify({
              model: LLM_MODEL,
              messages: [{ role: "user", content: `Do any of these headlines indicate a zone lockdown/curfew/strike in India? Reply JSON only: {"qualifies":true/false,"severity":0-10,"zone":"city if identifiable"}. Headlines: ${articles.map((a: { title?: string }) => a.title).join("; ")}` }],
            }),
          });
          if (llmRes.ok) {
            const llmData = await llmRes.json();
            const content = llmData.choices?.[0]?.message?.content ?? "{}";
            const m = content.match(/\{[\s\S]*\}/);
            if (m) {
              try {
                const p = JSON.parse(m[0]);
                if (p.qualifies && (p.severity ?? 0) >= 6) {
                  const zone = typeof p.zone === "string" ? p.zone.trim() : "";
                  const toGeocode = zone || "India";
                  let geofence: Record<string, unknown> = {};
                  try {
                    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(toGeocode)}&count=1`);
                    if (geoRes.ok) {
                      const geo = await geoRes.json();
                      if (geo.results?.[0]) {
                        geofence = { type: "circle", lat: geo.results[0].latitude, lng: geo.results[0].longitude, radius_km: zone ? 15 : 50 };
                      }
                    }
                  } catch { /* skip */ }
                  if (geofence.lat != null && geofence.lng != null) {
                    candidates.push({ type: "social", severity: p.severity ?? 7, geofence, raw: { articles, llm: p } });
                  }
                }
              } catch { /* skip */ }
            }
          }
        }
      }
    }

      // Accumulate zone candidates, deduplicating news-based triggers
      for (const c of candidates) {
        const isDuplicate = allCandidates.some((existing) => {
          const existingTrigger = existing.raw.trigger;
          const newTrigger = c.raw.trigger;
          return existingTrigger === newTrigger && existing.type === c.type;
        });
        if (!isDuplicate) allCandidates.push(c);
      }
    } // end zone loop

    if (allCandidates.length === 0 && !tomorrowKey && !newsDataKey) {
      return jsonResponse({ message: "No API keys configured.", triggers_processed: 0 });
    }

    // ── 5. Process candidates ─────────────────────────────────────────────────
    let claimsCreated = 0;
    const today = new Date().toISOString().split("T")[0];
    const weekStart = currentWeekMonday();

    for (const candidate of allCandidates) {
      const { data: event } = await supabase
        .from("live_disruption_events")
        .insert({ event_type: candidate.type, severity_score: candidate.severity, geofence_polygon: candidate.geofence ?? {}, verified_by_llm: candidate.type === "social", raw_api_data: candidate.raw })
        .select("id")
        .single();
      if (!event?.id) continue;

      const gf = candidate.geofence as { lat?: number; lng?: number; radius_km?: number } | undefined;
      const eventLat = gf?.lat ?? DEFAULT_LAT;
      const eventLng = gf?.lng ?? DEFAULT_LNG;
      const radiusKm = gf?.radius_km ?? 15;

      // Fetch policies with plan details for payout + weekly cap
      const { data: policies } = await supabase
        .from("weekly_policies")
        .select("id, profile_id, plan_packages(payout_per_claim_inr, max_claims_per_week)")
        .eq("is_active", true)
        .lte("week_start_date", today)
        .gte("week_end_date", today);

      for (const policy of policies ?? []) {
        const plan = policy.plan_packages as { payout_per_claim_inr?: number; max_claims_per_week?: number } | null;
        const payoutAmount = plan?.payout_per_claim_inr != null ? Number(plan.payout_per_claim_inr) : 400;
        const maxClaimsPerWeek = plan?.max_claims_per_week ?? 3;

        const { data: profile } = await supabase.from("profiles").select("zone_latitude, zone_longitude").eq("id", policy.profile_id).single();
        const pLat = profile?.zone_latitude;
        const pLng = profile?.zone_longitude;
        if (pLat != null && pLng != null && !isWithinCircle(pLat, pLng, eventLat, eventLng, radiusKm)) continue;

        // Enforce weekly claim cap
        const { count: weekCount } = await supabase
          .from("parametric_claims")
          .select("id", { count: "exact", head: true })
          .eq("policy_id", policy.id)
          .gte("created_at", weekStart);
        if ((weekCount ?? 0) >= maxClaimsPerWeek) continue;

        // Fraud checks in parallel
        const [dupResult, rapidResult] = await Promise.all([
          supabase.from("parametric_claims").select("id").eq("policy_id", policy.id).eq("disruption_event_id", event.id).limit(1),
          checkRapidClaims(supabase, policy.id),
        ]);
        if ((dupResult.data ?? []).length > 0) continue;
        if (rapidResult) continue;
        if (candidate.type === "weather" && checkWeatherMismatch(candidate.raw)) continue;

        const txId = `oasis_payout_${Date.now()}_${policy.id.slice(0, 8)}_${Math.random().toString(36).slice(2, 7)}`;
        const { error } = await supabase.from("parametric_claims").insert({
          policy_id: policy.id,
          disruption_event_id: event.id,
          payout_amount_inr: payoutAmount,
          status: "paid",
          gateway_transaction_id: txId,
          is_flagged: false,
        });
        if (!error) claimsCreated++;
      }
    }

    // Log run to system_logs
    try {
      await supabase.from("system_logs").insert({
        event_type: "adjudicator_run",
        severity: "info",
        metadata: {
          candidates_found: allCandidates.length,
          claims_created: claimsCreated,
          zones_checked: zones.length,
          duration_ms: Date.now() - startMs,
        },
      });
    } catch { /* ignore */ }

    return jsonResponse({
      message: "Adjudicator run complete",
      candidates_found: allCandidates.length,
      claims_created: claimsCreated,
      zones_checked: zones.length,
    });
  } catch (err) {
    console.error("Adjudicator error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
