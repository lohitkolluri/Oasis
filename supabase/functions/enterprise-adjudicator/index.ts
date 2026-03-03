import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface DisruptionCandidate {
  type: "weather" | "traffic" | "social";
  severity: number;
  zone?: string;
  lat?: number;
  lng?: number;
  geofence?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tomorrowKey = Deno.env.get("TOMORROW_IO_API_KEY");
    const newsDataKey = Deno.env.get("NEWSDATA_IO_API_KEY");
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const candidates: DisruptionCandidate[] = [];

    if (tomorrowKey) {
      const lat = 12.9716;
      const lng = 77.5946;
      const weatherRes = await fetch(
        `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${tomorrowKey}`
      );
      if (weatherRes.ok) {
        const data = await weatherRes.json();
        const temp = data.data?.values?.temperature ?? 0;
        if (temp >= 43) {
          candidates.push({
            type: "weather",
            severity: 8,
            lat,
            lng,
            geofence: { type: "circle", lat, lng, radius_km: 5 },
            raw: data,
          });
        }
      }
    }

    if (newsDataKey && openRouterKey) {
      const newsRes = await fetch(
        `https://newsdata.io/api/1/news?apikey=${newsDataKey}&q=curfew%20OR%20strike%20OR%20lockdown&country=in&language=en&limit=5`
      );
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        const articles = newsData.results ?? [];
        if (articles.length > 0) {
          const llmRes = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterKey}`,
              "HTTP-Referer": supabaseUrl,
            },
            body: JSON.stringify({
              model: "openrouter/free",
              messages: [
                {
                  role: "user",
                  content: `Do any of these news headlines indicate a zone lockdown, curfew, or strike that would prevent Q-commerce delivery riders from working? Reply with JSON: { "qualifies": true/false, "severity": 0-10, "zone": "city/area if identifiable" }. Headlines: ${articles.map((a: { title?: string }) => a.title).join("; ")}`,
                },
              ],
            }),
          });
          if (llmRes.ok) {
            const llmData = await llmRes.json();
            const content = llmData.choices?.[0]?.message?.content ?? "{}";
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]) as { qualifies?: boolean; severity?: number; zone?: string };
              if (parsed.qualifies && (parsed.severity ?? 0) >= 6) {
                candidates.push({
                  type: "social",
                  severity: parsed.severity ?? 7,
                  zone: parsed.zone ?? "India",
                  geofence: { zone: parsed.zone },
                  raw: { articles, llm: parsed },
                });
              }
            }
          }
        }
      }
    }

    if (candidates.length === 0 && !tomorrowKey && !newsDataKey) {
      return jsonResponse({
        message: "No API keys configured. Add TOMORROW_IO_API_KEY or NEWSDATA_IO_API_KEY.",
        triggers_processed: 0,
      });
    }

    let claimsCreated = 0;

    for (const candidate of candidates) {
      const { data: event } = await supabase
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

      if (!event?.id) continue;

      const today = new Date().toISOString().split("T")[0];
      const { data: policies } = await supabase
        .from("weekly_policies")
        .select("id, profile_id")
        .eq("is_active", true)
        .lte("week_start_date", today)
        .gte("week_end_date", today);

      const payoutAmount = 400;

      for (const policy of policies ?? []) {
        const { error: claimErr } = await supabase
          .from("parametric_claims")
          .insert({
            policy_id: policy.id,
            disruption_event_id: event.id,
            payout_amount_inr: payoutAmount,
            status: "paid",
            gateway_transaction_id: `razorpay_sim_${Date.now()}_${policy.id.slice(0, 8)}`,
          });
        if (!claimErr) claimsCreated++;
      }
    }

    return jsonResponse({
      message: "Adjudicator run complete",
      candidates_found: candidates.length,
      claims_created: claimsCreated,
    });
  } catch (err) {
    console.error("Adjudicator error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
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
