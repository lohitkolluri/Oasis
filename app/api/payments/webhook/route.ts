/**
 * POST /api/payments/webhook
 * Razorpay webhooks (e.g. payment.captured) — idempotent backup to client-side verify.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayWebhookSecret } from '@/lib/config/env';
import { verifyRazorpayWebhookSignature } from '@/lib/payments/razorpay-crypto';
import { handleSubscriptionPaymentCapture } from '@/lib/payments/handle-subscription-capture';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const isProd = process.env.NODE_ENV === 'production';

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string | null;
        subscription_id?: string | null;
        amount?: number;
        status?: string;
        method?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  const webhookSecret = getRazorpayWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature =
    request.headers.get('x-razorpay-signature') ?? request.headers.get('X-Razorpay-Signature');

  if (!verifyRazorpayWebhookSignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let parsed: RazorpayWebhookPayload;
  try {
    parsed = JSON.parse(body) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (parsed.event !== 'payment.captured') {
    return NextResponse.json({ ok: true, message: 'Ignored event type' });
  }

  const entity = parsed.payload?.payment?.entity;
  const paymentId = entity?.id;
  const orderId = entity?.order_id;
  const subscriptionId = entity?.subscription_id;
  const method = entity?.method != null ? String(entity.method) : undefined;

  if (!paymentId) {
    return NextResponse.json({ ok: true, message: 'Missing payment id' });
  }

  if (entity?.status && entity.status !== 'captured') {
    return NextResponse.json({ ok: true, message: 'Payment not captured' });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    logger.error('Razorpay webhook: Supabase not configured', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: isProd ? 'Service unavailable' : 'Supabase not configured' },
      { status: 503 },
    );
  }

  if (subscriptionId) {
    const subResult = await handleSubscriptionPaymentCapture(admin, {
      id: paymentId,
      subscription_id: subscriptionId,
      amount: entity?.amount,
      status: entity?.status,
      method: method ?? null,
    });
    if (!subResult.ok) {
      return NextResponse.json(
        { error: isProd ? 'Failed to process subscription payment' : subResult.error },
        { status: subResult.status ?? 500 },
      );
    }
    return NextResponse.json({ ok: true, message: subResult.message });
  }

  if (!orderId) {
    return NextResponse.json({ ok: true, message: 'Missing order id' });
  }

  const { data: policy } = await admin
    .from('weekly_policies')
    .select('id, profile_id, weekly_premium_inr')
    .eq('razorpay_order_id', orderId)
    .single();

  if (!policy) {
    return NextResponse.json({ ok: true, message: 'Policy not found' });
  }

  const expectedPaise = Math.round(Number(policy.weekly_premium_inr) * 100);
  if (entity?.amount != null && Number(entity.amount) !== expectedPaise) {
    logger.warn('Razorpay webhook: amount mismatch', {
      policy_id: policy.id,
      expected: expectedPaise,
      got: entity.amount,
    });
    return NextResponse.json({ ok: true, message: 'Amount mismatch' });
  }

  const { data: result, error: rpcError } = await admin.rpc('process_razorpay_payment_event', {
    p_payment_id: paymentId,
    p_policy_id: policy.id,
    p_order_id: orderId,
    p_profile_id: policy.profile_id,
    p_amount_inr: Number(policy.weekly_premium_inr),
    p_payment_method: method ?? null,
  });

  if (rpcError) {
    logger.error('Razorpay webhook: process_razorpay_payment_event failed', {
      error: rpcError.message,
      payment_id: paymentId,
    });
    return NextResponse.json(
      { error: isProd ? 'Failed to process payment' : rpcError.message },
      { status: 500 },
    );
  }

  const status = Array.isArray(result) ? result[0] : result;
  if (status === 'already_processed') {
    return NextResponse.json({ ok: true, message: 'Already processed' });
  }

  return NextResponse.json({ ok: true });
}
