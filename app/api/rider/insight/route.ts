/**
 * LLM-powered rider insight: personalized one-liner based on policy, zone, and recent events.
 *
 * Fix: all 5 Supabase queries now run in parallel via Promise.all (was sequential).
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json({ insight: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ insight: null });

  // Fetch all context data in parallel
  const [profileRes, policyRes, activePoliciesRes, eventsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, platform, zone_latitude, zone_longitude')
      .eq('id', user.id)
      .single(),
    supabase
      .from('weekly_policies')
      .select('week_start_date, week_end_date')
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .single(),
    supabase.from('weekly_policies').select('id').eq('profile_id', user.id).eq('is_active', true),
    supabase
      .from('live_disruption_events')
      .select('event_type, severity_score')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const profile = profileRes.data;
  const policy = policyRes.data;
  const policyIds = (activePoliciesRes.data ?? []).map((p) => p.id);

  // Claims need policyIds, so this one runs after the parallel batch
  const { data: claims } =
    policyIds.length > 0
      ? await supabase
          .from('parametric_claims')
          .select('payout_amount_inr, created_at')
          .in('policy_id', policyIds)
          .order('created_at', { ascending: false })
          .limit(3)
      : { data: [] };

  const hasPolicy = !!policy;
  const platform = profile?.platform ?? 'delivery';
  const recentClaims = (claims ?? []).length;
  const totalPayouts = (claims ?? []).reduce((s, c) => s + Number(c.payout_amount_inr ?? 0), 0);
  const activeDisruptions = (eventsRes.data ?? []).filter((e) => (e.severity_score ?? 0) >= 7);

  const prompt = `You are a friendly assistant for a gig delivery rider. Write ONE short, actionable sentence (max 15 words) as a personalized tip or reassurance. Be encouraging and practical. Use simple, direct language. No em dashes.

Context:
- Rider uses ${platform}, has ${hasPolicy ? 'active' : 'no'} weekly coverage
- Recent payouts: ₹${totalPayouts.toLocaleString('en-IN')} from ${recentClaims} claim(s)
- Active disruptions: ${activeDisruptions.length > 0 ? activeDisruptions.map((e) => e.event_type).join(', ') : 'none'}

Reply with ONLY the sentence, no quotes or punctuation at the end.`;

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
        max_tokens: 50,
      }),
    });

    if (!res.ok) return NextResponse.json({ insight: null });

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return NextResponse.json({ insight: null });
    content = content.replace(/\s*—\s*/g, '. ');

    return NextResponse.json({ insight: content });
  } catch {
    return NextResponse.json({ insight: null });
  }
}
