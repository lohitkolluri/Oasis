/**
 * Verifies Razorpay subscription checkout (mandate) signature and activates the pending weekly policy.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getRazorpayKeySecret } from '@/lib/config/env';
import { getRazorpayInstance } from '@/lib/clients/razorpay';
import { verifyRazorpaySubscriptionPaymentSignature } from '@/lib/payments/razorpay-crypto';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = parsed.data;
  const secret = getRazorpayKeySecret();

  if (
    !verifyRazorpaySubscriptionPaymentSignature(
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      secret,
    )
  ) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    logger.error('Razorpay subscription verify: Supabase not configured', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const razorpay = getRazorpayInstance();
  type Pay = {
    subscription_id?: string;
    status?: string;
    amount?: number;
    method?: string;
  };
  let payment: Pay;
  try {
    payment = (await razorpay.payments.fetch(razorpay_payment_id)) as Pay;
  } catch (err) {
    logger.warn('Razorpay subscription verify: payments.fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Could not confirm payment' }, { status: 502 });
  }

  /**
   * Razorpay often omits `subscription_id` on the Payment entity right after mandate auth
   * (field is optional in their API). HMAC above already binds payment_id + subscription_id.
   */
  const paySubId = payment.subscription_id?.trim();
  if (paySubId && paySubId !== razorpay_subscription_id.trim()) {
    logger.warn('Razorpay subscription verify: subscription id on payment differs from checkout', {
      payment_id: razorpay_payment_id,
      from_payment: paySubId,
      from_checkout: razorpay_subscription_id,
    });
    return NextResponse.json({ error: 'Subscription mismatch' }, { status: 400 });
  }

  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    return NextResponse.json(
      { error: `Payment not completed (status: ${payment.status})` },
      { status: 400 },
    );
  }

  const { data: pending, error: pendErr } = await admin
    .from('weekly_policies')
    .select('id, profile_id, plan_id, weekly_premium_inr, week_start_date, week_end_date')
    .eq('profile_id', user.id)
    .eq('razorpay_subscription_id', razorpay_subscription_id)
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendErr || !pending) {
    return NextResponse.json({ error: 'No pending subscription policy found' }, { status: 404 });
  }

  const expectedPaise = Math.round(Number(pending.weekly_premium_inr) * 100);
  if (payment.amount != null && Number(payment.amount) !== expectedPaise) {
    logger.error('Razorpay subscription verify: amount mismatch', {
      policy_id: pending.id,
      expected: expectedPaise,
      got: payment.amount,
    });
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  const method = payment.method != null ? String(payment.method) : null;

  const { data: result, error: rpcError } = await admin.rpc('process_razorpay_subscription_payment', {
    p_payment_id: razorpay_payment_id,
    p_profile_id: pending.profile_id,
    p_plan_id: pending.plan_id ?? null,
    p_amount_inr: Number(pending.weekly_premium_inr),
    p_subscription_id: razorpay_subscription_id,
    p_week_start: pending.week_start_date,
    p_week_end: pending.week_end_date,
    p_payment_method: method,
  });

  if (rpcError) {
    logger.error('Razorpay subscription verify: RPC failed', {
      error: rpcError.message,
      payment_id: razorpay_payment_id,
    });
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const status = Array.isArray(result) ? result[0] : result;
  return NextResponse.json({
    ok: true,
    alreadyProcessed: status === 'already_processed',
  });
}
