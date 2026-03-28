/**
 * Cancels Razorpay weekly subscription (stops auto-renewal). Current week coverage stays until it ends.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getRazorpayInstance } from '@/lib/clients/razorpay';
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
      .select('razorpay_subscription_id')
      .eq('id', user.id)
      .single();

    if (error || !profile?.razorpay_subscription_id) {
      return NextResponse.json({ error: 'No active subscription mandate to cancel' }, { status: 400 });
    }

    const razorpay = getRazorpayInstance();
    try {
      await razorpay.subscriptions.cancel(profile.razorpay_subscription_id);
    } catch {
      /* may already be cancelled on Razorpay side */
    }

    await admin
      .from('profiles')
      .update({
        auto_renew_enabled: false,
        razorpay_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, 'Failed to cancel subscription');
  }
}
