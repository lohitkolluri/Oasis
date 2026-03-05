/**
 * LLM-powered admin insights: executive summary and recommended actions.
 * Uses OpenRouter (openrouter/free) to analyze platform stats.
 * Admin-only.
 */
import { isAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!isAdmin(user, profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminSupabase = createAdminClient();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [policiesRes, claimsRes, eventsRes, reportsRes] = await Promise.all([
    adminSupabase.from('weekly_policies').select('weekly_premium_inr').eq('is_active', true),
    adminSupabase.from('parametric_claims').select('payout_amount_inr, is_flagged'),
    adminSupabase
      .from('live_disruption_events')
      .select('event_type, severity_score')
      .order('created_at', { ascending: false })
      .limit(10),
    // rider_delivery_reports table may not exist in all environments — guard with try/catch
    (async () => {
      try {
        return await adminSupabase
          .from('rider_delivery_reports')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since24h);
      } catch {
        return { data: null, count: 0 };
      }
    })(),
  ]);

  const policies = policiesRes.data ?? [];
  const claims = claimsRes.data ?? [];
  // Derive fraudCount from claims already fetched — avoids a redundant round-trip
  const fraudCount = claims.filter((c: { is_flagged: boolean }) => c.is_flagged).length;
  const events = eventsRes.data ?? [];
  const reportsLast24h = reportsRes.count ?? 0;

  const totalPremiums = policies.reduce(
    (s: number, p: { weekly_premium_inr: unknown }) => s + Number(p.weekly_premium_inr),
    0,
  );
  const totalPayouts = claims.reduce(
    (s: number, c: { payout_amount_inr: unknown }) => s + Number(c.payout_amount_inr),
    0,
  );
  const lossRatio = totalPremiums > 0 ? ((totalPayouts / totalPremiums) * 100).toFixed(1) : '0';

  /** Fallback when LLM is unavailable — always show useful insights from platform data */
  function fallbackInsights(): { summary: string; actions: string[] } {
    const parts: string[] = [];
    parts.push(`${policies.length} active polic${policies.length === 1 ? 'y' : 'ies'}`);
    parts.push(`₹${totalPremiums.toLocaleString('en-IN')} weekly premiums`);
    parts.push(`₹${totalPayouts.toLocaleString('en-IN')} in payouts`);
    parts.push(`loss ratio ${lossRatio}%`);
    const actions: string[] = [];
    if (fraudCount > 0) actions.push('Review flagged claims in Fraud Queue');
    if (events.length > 0) actions.push('Monitor live disruption events in Triggers');
    if (Number(lossRatio) > 80)
      actions.push('Review loss ratio — consider premium or payout adjustments');
    if (actions.length === 0) actions.push('Platform operating normally');
    return {
      summary: `Platform snapshot: ${parts.join('; ')}.`,
      actions,
    };
  }

  const prompt = `You are an insurance operations analyst. Given this Oasis parametric platform snapshot, write:
1. A 1–2 sentence executive summary (professional, concise).
2. Up to 3 recommended actions as bullet points (e.g., "Review fraud queue", "Monitor heat trigger").

Data:
- Active policies: ${policies.length}, total weekly premiums: ₹${totalPremiums.toLocaleString('en-IN')}
- Total payouts: ₹${totalPayouts.toLocaleString('en-IN')}, loss ratio: ${lossRatio}%
- Flagged claims: ${fraudCount}
- Disruption events (last 10): ${events.map((e: { event_type: string; severity_score: number }) => `${e.event_type} severity ${e.severity_score}`).join('; ')}
- Rider self-reports (last 24h): ${reportsLast24h}

Respond with JSON only: {"summary": "...", "actions": ["...", "..."]}`;

  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    return NextResponse.json(fallbackInsights());
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'arcee-ai/trinity-large-preview:free:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn('[admin/insights] OpenRouter error:', res.status, errBody);
      return NextResponse.json(fallbackInsights());
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';

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
      summary: parsed.summary ?? 'Platform status: operational.',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    });
  } catch (err) {
    console.warn('[admin/insights] LLM fetch failed:', err);
    return NextResponse.json(fallbackInsights());
  }
}
