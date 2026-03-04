/**
 * LLM-powered admin insights: executive summary and recommended actions.
 * Uses OpenRouter (openrouter/free) to analyze platform stats.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json({
      summary: "Connect OPENROUTER_API_KEY for AI insights.",
      actions: [],
    });
  }

  const supabase = createAdminClient();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [policiesRes, claimsRes, fraudRes, eventsRes, reportsRes] = await Promise.all([
    supabase.from("weekly_policies").select("weekly_premium_inr, is_active").eq("is_active", true),
    supabase.from("parametric_claims").select("payout_amount_inr, is_flagged, created_at"),
    supabase.from("parametric_claims").select("id").eq("is_flagged", true),
    supabase
      .from("live_disruption_events")
      .select("event_type, severity_score, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    // rider_delivery_reports table may not exist in all environments — guard with try/catch
    (async () => {
      try {
        return await supabase
          .from("rider_delivery_reports")
          .select("id")
          .gte("created_at", since24h);
      } catch {
        return { data: null };
      }
    })(),
  ]);

  const policies = policiesRes.data ?? [];
  const claims = claimsRes.data ?? [];
  const fraudCount = fraudRes.data?.length ?? 0;
  const events = eventsRes.data ?? [];
  const reportsLast24h = reportsRes.data?.length ?? 0;

  const totalPremiums = policies.reduce(
    (s: number, p: { weekly_premium_inr: unknown }) => s + Number(p.weekly_premium_inr),
    0
  );
  const totalPayouts = claims.reduce(
    (s: number, c: { payout_amount_inr: unknown }) => s + Number(c.payout_amount_inr),
    0
  );
  const lossRatio = totalPremiums > 0 ? ((totalPayouts / totalPremiums) * 100).toFixed(1) : "0";

  const prompt = `You are an insurance operations analyst. Given this Oasis parametric platform snapshot, write:
1. A 1–2 sentence executive summary (professional, concise).
2. Up to 3 recommended actions as bullet points (e.g., "Review fraud queue", "Monitor heat trigger").

Data:
- Active policies: ${policies.length}, total weekly premiums: ₹${totalPremiums.toLocaleString("en-IN")}
- Total payouts: ₹${totalPayouts.toLocaleString("en-IN")}, loss ratio: ${lossRatio}%
- Flagged claims: ${fraudCount}
- Disruption events (last 10): ${events.map((e: { event_type: string; severity_score: number }) => `${e.event_type} severity ${e.severity_score}`).join("; ")}
- Rider self-reports (last 24h): ${reportsLast24h}

Respond with JSON only: {"summary": "...", "actions": ["...", "..."]}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        summary: "AI insights temporarily unavailable.",
        actions: fraudCount > 0 ? ["Review flagged claims in Fraud Queue"] : [],
      });
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed: { summary?: string; actions?: string[] } = {};
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = { summary: content.slice(0, 200), actions: [] };
      }
    } else {
      parsed = { summary: content.slice(0, 200), actions: [] };
    }

    return NextResponse.json({
      summary: parsed.summary ?? "Platform status: operational.",
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    });
  } catch {
    return NextResponse.json({
      summary: "AI insights temporarily unavailable.",
      actions: fraudCount > 0 ? ["Review flagged claims in Fraud Queue"] : [],
    });
  }
}
