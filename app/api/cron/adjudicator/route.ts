import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkDuplicateClaim } from "@/lib/fraud/detector";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const tomorrowKey = process.env.TOMORROW_IO_API_KEY;
  const ambeeKey = process.env.AMBEE_API_KEY;
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
      // Skip weather on error
    }
  }

  if (ambeeKey) {
    try {
      const aqiRes = await fetch(
        `https://api.ambeedata.com/latest/by-lat-lng?lat=${lat}&lng=${lng}`,
        { headers: { "x-api-key": ambeeKey } }
      );
      if (aqiRes.ok) {
        const aqiData = (await aqiRes.json()) as { data?: { aqi?: number } };
        const aqi = aqiData.data?.aqi ?? 0;
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
      // Skip AQI on error
    }
  }

  if (process.env.TRIGGER_TRAFFIC_DEMO === "true") {
    candidates.push({
      type: "traffic",
      severity: 6,
      geofence: { type: "circle", lat, lng, radius_km: 3 },
      raw: { trigger: "demo_traffic_gridlock" },
    });
  }

  const newsDataKey = process.env.NEWSDATA_IO_API_KEY;
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
            const llmData = (await llmRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
            const content = llmData.choices?.[0]?.message?.content ?? "{}";
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]) as { qualifies?: boolean; severity?: number };
                if (parsed.qualifies && (parsed.severity ?? 0) >= 6) {
                  candidates.push({
                    type: "social",
                    severity: parsed.severity ?? 7,
                    geofence: {},
                    raw: { articles, llm: parsed },
                  });
                }
              } catch {
                // Skip on parse error
              }
            }
          }
        }
      }
    } catch {
      // Skip news on error
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

    const today = new Date().toISOString().split("T")[0];
    const { data: policies } = await supabase
      .from("weekly_policies")
      .select("id, profile_id")
      .eq("is_active", true)
      .lte("week_start_date", today)
      .gte("week_end_date", today);

      const payoutAmount = 400;

      for (const policy of policies ?? []) {
        const { isFlagged } = await checkDuplicateClaim(
          supabase,
          policy.id,
          event.id
        );
        if (isFlagged) continue;

        const { error: claimErr } = await supabase.from("parametric_claims").insert({
          policy_id: policy.id,
          disruption_event_id: event.id,
          payout_amount_inr: payoutAmount,
          status: "paid",
          gateway_transaction_id: `razorpay_sim_${Date.now()}_${policy.id.slice(0, 8)}`,
          is_flagged: false,
        });
        if (!claimErr) claimsCreated++;
      }
  }

  return NextResponse.json({
    message: "Adjudicator run complete",
    candidates_found: candidates.length,
    claims_created: claimsCreated,
  });
}
