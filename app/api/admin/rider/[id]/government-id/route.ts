/**
 * GET /api/admin/rider/[id]/government-id
 * Admin-only. Returns a short-lived signed URL for the rider's government ID image.
 * Use on-demand (e.g. when admin clicks "View ID") rather than embedding in page.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

const BUCKET = 'government-ids';
const URL_EXPIRY_SEC = 300; // 5 minutes

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_ctx, request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // [... 'admin', 'rider', id, 'government-id']
  const id = segments.length >= 2 ? segments[segments.length - 2] : null;
  if (!id) {
    return NextResponse.json({ error: 'Rider ID required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('government_id_url')
    .eq('id', id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const path = (profile as { government_id_url?: string | null }).government_id_url;
  if (!path || typeof path !== 'string') {
    return NextResponse.json({ url: null, message: 'No government ID on file' }, { status: 200 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, URL_EXPIRY_SEC);

  if (signError) {
    return NextResponse.json(
      { error: 'Could not generate access URL' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: signed?.signedUrl ?? null,
    expiresIn: URL_EXPIRY_SEC,
  });
});
