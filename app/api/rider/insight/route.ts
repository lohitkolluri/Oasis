/**
 * LLM-powered rider insight: personalized one-liner based on policy, zone, and recent events.
 *
 * Fix: all 5 Supabase queries now run in parallel via Promise.all (was sequential).
 */
import { callOpenRouterChat } from '@/lib/clients/openrouter';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitKey } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limitKey = rateLimitKey(request, 'rider-insight');
  const rateLimited = await checkRateLimit(limitKey, { maxRequests: 10 });
  if (rateLimited) return rateLimited;

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json({ insight: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const disruptions =
    activeDisruptions.length > 0
      ? activeDisruptions
          .map((e) => String(e.event_type ?? '').trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(', ')
      : 'none';

  const system = [
    'You write micro-copy for a gig delivery rider in India.',
    'Product scope: this is weekly income-protection for external disruptions only.',
    'Never mention health, life, accidents, or vehicle repairs as covered.',
    '',
    'Output rules:',
    '- Exactly ONE sentence, <= 15 words.',
    '- Plain language. No emojis. No quotes. No em dashes.',
    '- Do not end with punctuation.',
  ].join('\n');

  const userPrompt = [
    'Write one actionable tip or reassurance based on this context:',
    `- Platform: ${platform}`,
    `- Weekly coverage: ${hasPolicy ? 'active' : 'none'}`,
    `- Recent payouts: INR ${totalPayouts.toLocaleString('en-IN')} across ${recentClaims} claim(s)`,
    `- Active disruptions: ${disruptions}`,
  ].join('\n');

  try {
    const data = await callOpenRouterChat({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      temperature: 0,
      max_tokens: 40,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    });
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return NextResponse.json({ insight: null });
    content = content.replace(/\s*—\s*/g, '. ');
    content = content.replace(/["'`]+/g, '').trim();
    content = content.replace(/[.!?]+$/g, '').trim();

    return NextResponse.json({ insight: content });
  } catch {
    return NextResponse.json({ insight: null });
  }
}
