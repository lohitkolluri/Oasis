import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';

export const dynamic = 'force-dynamic';

/** Recent admin audit entries (append-only). */
export const GET = withAdminAuth(async (_ctx, request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 80));

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_audit_log')
    .select('id,created_at,actor_id,actor_email,action,resource_type,resource_id,metadata')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
});
