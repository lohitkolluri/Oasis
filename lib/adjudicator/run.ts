/**
 * Parametric adjudicator: ingest real APIs (weather, AQI, news), create disruption
 * events, auto-payout. Shared between cron and admin on-demand run.
 */

import { createClient } from "@supabase/supabase-js";
import { runAllFraudChecks } from "@/lib/fraud/detector";

/** Haversine distance in km. Returns true if point is within radius of center. */
function isWithinCircle(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  const R = 6371; // Earth radius km
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

export interface AdjudicatorResult {
  candidates_found: number;
  claims_created: number;
  message: string;
}

export async function runAdjudicator(): Promise<AdjudicatorResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const tomorrowKey = process.env.TOMORROW_IO_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const lat = 12.9716;
  const lng = 77.5946;

  const candidates: Array<{
    type: "weather" | "traffic" | "social";
    severity: number;
    geofence?: Record<string, unknown>;
    raw: Record<string, unknown>;
  }> = [];

  if (tomorrowKey) {
    try {
      const res = await fetch(
        `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${tomorrowKey}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          data?: { values?: { temperature?: number; precipitationIntensity?: number } };
        };
        const vals = data.data?.values ?? {};
        const temp = vals.temperature ?? 0;
        const precip = vals.precipitationIntensity ?? 0;
        if (temp >= 43) {
          candidates.push({
            type: "weather",
            severity: 8,
            geofence: { type: "circle", lat, lng, radius_km: 5 },
            raw: { ...data, trigger: "extreme_heat" },
          });
        }
        if (precip >= 4) {
          candidates.push({
            type: "weather",
            severity: 7,
            geofence: { type: "circle", lat, lng, radius_km: 5 },
            raw: { ...data, trigger: "heavy_rain" },
          });
        }
      }
    } catch {
      // Skip
    }
  }

  // Open-Meteo Air Quality API - free, no API key required
  try {
    const aqiRes = await fetch(
      `https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi`
    );
    if (aqiRes.ok) {
      const aqiData = (await aqiRes.json()) as {
        hourly?: { time?: string[]; us_aqi?: (number | null)[] };
      };
      const usAqiArr = aqiData.hourly?.us_aqi ?? [];
      const aqi = usAqiArr.find((v) => v != null) ?? 0;
      if (aqi >= 300) {
        candidates.push({
          type: "weather",
          severity: 7,
          geofence: { type: "circle", lat, lng, radius_km: 5 },
          raw: { ...aqiData, trigger: "severe_aqi" },
        });
      }
    }
  } catch {
    // Skip
  }

  // Traffic trigger: NewsData for gridlock/road closures (5th parametric trigger)
  const newsDataKey = process.env.NEWSDATA_IO_API_KEY;
  if (newsDataKey && openRouterKey) {
    try {
      const trafficRes = await fetch(
        `https://newsdata.io/api/1/news?apikey=${newsDataKey}&q=traffic%20OR%20gridlock%20OR%20road%20closure%20OR%20congestion&country=in&language=en&limit=3`
      );
      if (trafficRes.ok) {
        const trafficData = (await trafficRes.json()) as {
          results?: Array<{ title?: string }>;
        };
        const trafficArticles = trafficData.results ?? [];
        if (trafficArticles.length > 0) {
          const llmTrafficRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterKey}`,
            },
            body: JSON.stringify({
              model: "openrouter/free",
              messages: [
                {
                  role: "user",
                  content: `Do any of these headlines indicate severe traffic gridlock or road closures affecting delivery work in India? Reply JSON only: {"qualifies":true/false,"severity":0-10}. Headlines: ${trafficArticles.map((a) => a.title).join("; ")}`,
                },
              ],
            }),
          });
          if (llmTrafficRes.ok) {
            const llmTrafficData = (await llmTrafficRes.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const content = llmTrafficData.choices?.[0]?.message?.content ?? "{}";
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]) as {
                  qualifies?: boolean;
                  severity?: number;
                };
                if (parsed.qualifies && (parsed.severity ?? 0) >= 6) {
                  candidates.push({
                    type: "traffic",
                    severity: parsed.severity ?? 7,
                    geofence: { type: "circle", lat, lng, radius_km: 10 },
                    raw: { articles: trafficArticles, llm: parsed, trigger: "traffic_gridlock" },
                  });
                }
              } catch {
                // Skip
              }
            }
          }
        }
      }
    } catch {
      // Skip
    }
  }

  if (newsDataKey && openRouterKey) {
    try {
      const newsRes = await fetch(
        `https://newsdata.io/api/1/news?apikey=${newsDataKey}&q=curfew%20OR%20strike%20OR%20lockdown&country=in&language=en&limit=3`
      );
      if (newsRes.ok) {
        const newsData = (await newsRes.json()) as { results?: Array<{ title?: string }> };
        const articles = newsData.results ?? [];
        if (articles.length > 0) {
          const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterKey}`,
            },
            body: JSON.stringify({
              model: "openrouter/free",
              messages: [
                {
                  role: "user",
                  content: `Do any of these headlines indicate a zone lockdown/curfew/strike preventing delivery work? Reply JSON only: {"qualifies":true/false,"severity":0-10}. Headlines: ${articles.map((a) => a.title).join("; ")}`,
                },
              ],
            }),
          });
          if (llmRes.ok) {
            const llmData = (await llmRes.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const content = llmData.choices?.[0]?.message?.content ?? "{}";
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]) as {
                  qualifies?: boolean;
                  severity?: number;
                };
                if (parsed.qualifies && (parsed.severity ?? 0) >= 6) {
                  candidates.push({
                    type: "social",
                    severity: parsed.severity ?? 7,
                    geofence: {},
                    raw: { articles, llm: parsed },
                  });
                }
              } catch {
                // Skip
              }
            }
          }
        }
      }
    } catch {
      // Skip
    }
  }

  let claimsCreated = 0;

  for (const candidate of candidates) {
    const { data: event, error: eventErr } = await supabase
      .from("live_disruption_events")
      .insert({
        event_type: candidate.type,
        severity_score: candidate.severity,
        geofence_polygon: candidate.geofence ?? {},
        verified_by_llm: candidate.type === "social",
        raw_api_data: candidate.raw,
      })
      .select("id")
      .single();

    if (eventErr || !event?.id) continue;

    const geofence = candidate.geofence as { type?: string; lat?: number; lng?: number; radius_km?: number } | undefined;
    const eventLat = geofence?.lat ?? lat;
    const eventLng = geofence?.lng ?? lng;
    const radiusKm = geofence?.radius_km ?? 10;

    const today = new Date().toISOString().split("T")[0];
    const { data: policies } = await supabase
      .from("weekly_policies")
      .select("id, profile_id")
      .eq("is_active", true)
      .lte("week_start_date", today)
      .gte("week_end_date", today);

    const payoutAmount = 400;

    for (const policy of policies ?? []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("zone_latitude, zone_longitude")
        .eq("id", policy.profile_id)
        .single();

      const pLat = profile?.zone_latitude;
      const pLng = profile?.zone_longitude;
      if (pLat != null && pLng != null) {
        if (!isWithinCircle(pLat, pLng, eventLat, eventLng, radiusKm)) continue;
      }
      const { isFlagged } = await runAllFraudChecks(
        supabase,
        policy.id,
        event.id,
        candidate.type === "weather" ? candidate.raw : undefined
      );
      if (isFlagged) continue;

      const { error: claimErr } = await supabase.from("parametric_claims").insert({
        policy_id: policy.id,
        disruption_event_id: event.id,
        payout_amount_inr: payoutAmount,
        status: "paid",
        gateway_transaction_id: `oasis_payout_${Date.now()}_${policy.id.slice(0, 8)}`,
        is_flagged: false,
      });
      if (!claimErr) claimsCreated++;
    }
  }

  return {
    message: "Adjudicator run complete",
    candidates_found: candidates.length,
    claims_created: claimsCreated,
  };
}
