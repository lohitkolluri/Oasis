import { createClient } from '@/lib/supabase/server';
import { RIDER_LOCALE_COOKIE, isRiderLocale } from '@/lib/i18n/rider';
import { checkRateLimit, rateLimitKey } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const limitKey = rateLimitKey(request, 'rider-profile');
  const rateLimited = await checkRateLimit(limitKey, { maxRequests: 30 });
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const updates: Record<string, string | null> = {};

  if ('full_name' in body) {
    if (typeof body.full_name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    const n = body.full_name.trim();
    if (n.length < 1 || n.length > 120) {
      return NextResponse.json({ error: 'Name must be 1–120 characters' }, { status: 400 });
    }
    updates.full_name = n;
  }

  if ('phone_number' in body) {
    if (body.phone_number === null || body.phone_number === '') {
      updates.phone_number = null;
    } else if (typeof body.phone_number === 'string') {
      updates.phone_number = body.phone_number.trim().slice(0, 20) || null;
    } else {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }
  }

  if ('platform' in body) {
    if (body.platform !== 'zepto' && body.platform !== 'blinkit') {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    updates.platform = body.platform;
  }

  if ('preferred_language' in body) {
    if (!isRiderLocale(body.preferred_language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }
    updates.preferred_language = body.preferred_language;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No changes' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('full_name, phone_number, platform, preferred_language')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ profile: data });
  if (typeof updates.preferred_language === 'string') {
    response.cookies.set(RIDER_LOCALE_COOKIE, updates.preferred_language, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  return response;
}
