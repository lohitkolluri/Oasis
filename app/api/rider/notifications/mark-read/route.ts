import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitKey } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limitKey = rateLimitKey(request, 'rider-notifications-mark-read');
  const rateLimited = await checkRateLimit(limitKey, {
    maxRequests: 60,
    windowMs: 60_000,
    request,
  });
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('mark_rider_notifications_read');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const marked = typeof data === 'number' ? data : 0;
  return NextResponse.json({ marked });
}
