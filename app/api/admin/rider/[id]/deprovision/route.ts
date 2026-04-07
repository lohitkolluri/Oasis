import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Body = {
  reason?: string | null;
};

type DeprovisionResult = { ok?: boolean; error?: string };

export const POST = withAdminAuth(async (ctx, request) => {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[parts.length - 2]; // .../rider/:id/deprovision

  if (!id) {
    return NextResponse.json({ error: 'Missing rider id' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 240) : null;

  const { data, error } = await ctx.admin.rpc('admin_deprovision_rider', {
    p_profile_id: id,
    p_reason: reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as DeprovisionResult | null;
  if (!result?.ok) {
    const msg = result?.error ?? 'Deprovision failed';
    const status =
      msg === 'Profile not found' ? 404 : msg === 'Cannot deprovision admin accounts' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ ok: true });
});
