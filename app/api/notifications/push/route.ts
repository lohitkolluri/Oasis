import { getVapidPrivateKey, getVapidPublicKey } from '@/lib/config/env';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

function webPushReady(): boolean {
  return !!(getVapidPublicKey() && getVapidPrivateKey());
}

export async function GET() {
  const pub = getVapidPublicKey();
  const ready = webPushReady();
  return NextResponse.json({
    configured: ready,
    publicKey: ready && pub ? pub : null,
    // Helpful diagnostics for local/staging setups.
    ...(ready
      ? {}
      : {
          reason:
            !pub && !getVapidPrivateKey()
              ? 'Missing VAPID public and private keys'
              : !pub
                ? 'Missing VAPID public key'
                : 'Missing VAPID private key',
        }),
  });
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!webPushReady()) {
    return NextResponse.json({ error: 'Web Push is not configured' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get('user-agent')?.slice(0, 512) ?? null;

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      profile_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({
  endpoint: z.string().url().optional(),
});

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (parsed.data.endpoint) {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('profile_id', user.id)
      .eq('endpoint', parsed.data.endpoint);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from('push_subscriptions').delete().eq('profile_id', user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
