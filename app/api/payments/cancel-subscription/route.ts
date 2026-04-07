/**
 * Cancels Razorpay weekly subscription (stops auto-renewal). Current week coverage stays until it ends.
 */
import { getRazorpayInstance } from '@/lib/clients/razorpay';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('razorpay_subscription_id, auto_renew_enabled, razorpay_cancel_status')
      .eq('id', user.id)
      .single();

    if (error || !profile?.razorpay_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription mandate to cancel' },
        { status: 400 },
      );
    }

    // Phase 1: persist the intent to cancel (so failures are visible and retryable).
    const { error: markErr } = await admin
      .from('profiles')
      .update({
        razorpay_cancel_status: 'pending',
        razorpay_cancel_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (markErr) {
      await admin.from('system_logs').insert({
        event_type: 'subscription_cancel_failed',
        severity: 'error',
        metadata: {
          profile_id: user.id,
          stage: 'db_mark_pending',
          error: markErr.message,
        },
      });
      return NextResponse.json(
        { error: 'Failed to start cancellation. Please try again.' },
        { status: 500 },
      );
    }

    const razorpay = getRazorpayInstance();
    try {
      await razorpay.subscriptions.cancel(profile.razorpay_subscription_id);
    } catch (err) {
      await admin.from('system_logs').insert({
        event_type: 'subscription_cancel_failed',
        severity: 'error',
        metadata: {
          profile_id: user.id,
          stage: 'razorpay_cancel',
          subscription_id: profile.razorpay_subscription_id,
          error: err instanceof Error ? err.message : String(err),
        },
      });
      // Keep cancel_status=pending so the UI/admin can see it's unresolved.
      return NextResponse.json(
        { error: 'Cancellation provider error. Please retry in a moment.' },
        { status: 502 },
      );
    }

    // Phase 2: finalize DB state only after provider cancel succeeded.
    const { error: finalizeErr } = await admin
      .from('profiles')
      .update({
        auto_renew_enabled: false,
        razorpay_subscription_id: null,
        razorpay_cancel_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (finalizeErr) {
      // Provider cancelled but DB failed: log loudly and surface non-200 so clients retry.
      await admin.from('system_logs').insert({
        event_type: 'subscription_cancel_failed',
        severity: 'error',
        metadata: {
          profile_id: user.id,
          stage: 'db_finalize',
          subscription_id: profile.razorpay_subscription_id,
          error: finalizeErr.message,
        },
      });
      return NextResponse.json(
        {
          error:
            'Cancellation recorded with provider but failed to update your profile. Please retry.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, 'Failed to cancel subscription');
  }
}
