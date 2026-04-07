import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ResetBody = {
  sourceIds: string[];
};

export const POST = withAdminAuth(async (ctx, request) => {
  const body = (await request.json().catch(() => null)) as ResetBody | null;
  const sourceIds = Array.isArray(body?.sourceIds) ? body!.sourceIds.filter((s) => typeof s === 'string') : [];

  if (sourceIds.length === 0) {
    return NextResponse.json({ error: 'sourceIds required' }, { status: 400 });
  }

  // Safety: cap how many rows can be reset in one request.
  const unique = Array.from(new Set(sourceIds.map((s) => s.trim()).filter((s) => s.length > 0))).slice(0, 25);

  const { error } = await ctx.admin
    .from('parametric_source_health')
    .update({
      error_streak: 0,
      success_streak: 0,
      last_error_at: null,
      // Preserve last_success_at / last_observed_at / latency fields for forensics.
      updated_at: new Date().toISOString(),
    })
    .in('source_id', unique);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reset: unique });
});

