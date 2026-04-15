// @ts-nocheck — Supabase Edge Functions run in Deno; IDE uses Node/TS config
import { createClient } from '@supabase/supabase-js';

/**
 * Enterprise Adjudicator — Supabase Edge Function
 * Delegates to the shared adjudicator core so behavior matches the Node cron path.
 */

// All trigger discovery, event creation, and claims logic now live in
// the Next.js app in lib/adjudicator/core.ts. This edge function simply
// calls the same HTTP entrypoint that the admin panel and cron use so
// behavior stays consistent.

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const startMs = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? '';
    if (!appUrl) {
      return jsonResponse({ error: 'NEXT_PUBLIC_APP_URL is not configured' }, 503);
    }

    const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
    if (!cronSecret.trim()) {
      return jsonResponse({ error: 'CRON_SECRET is not configured' }, 503);
    }
    const endpoint = new URL('/api/admin/run-adjudicator', appUrl).toString();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cronSecret}`,
        'x-supabase-function': 'enterprise-adjudicator',
      },
    });

    const body = await res.text();

    try {
      await supabase.from('system_logs').insert({
        event_type: 'adjudicator_run',
        severity: res.ok ? 'info' : 'error',
        metadata: {
          source: 'edge_function',
          status: res.status,
          raw_body: body.slice(0, 2000),
          duration_ms: Date.now() - startMs,
        },
      });
    } catch {
      /* ignore */
    }

    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  } catch (err) {
    console.error('Adjudicator error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

function corsHeaders() {
  const origin = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? '';
  return {
    'Access-Control-Allow-Origin': origin || 'https://oasis-app.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
