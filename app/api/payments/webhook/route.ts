/**
 * POST /api/payments/webhook
 * Razorpay webhooks (e.g. payment.captured) — idempotent backup to client-side verify.
 */
import { getRazorpayWebhookSecret } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { handleSubscriptionPaymentCapture } from '@/lib/payments/handle-subscription-capture';
import { verifyRazorpayWebhookSignature } from '@/lib/payments/razorpay-crypto';
import { createAdminClient } from '@/lib/supabase/admin';
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
        error_code?: string | null;
        error_description?: string | null;
      };
    };
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
      };
    };
  };
};

const HANDLED_EVENTS = new Set([
  'payment.captured',
  'payment.failed',
  'subscription.halted',
  'subscription.cancelled',
]);

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

  if (!parsed.event || !HANDLED_EVENTS.has(parsed.event)) {
    return NextResponse.json({ ok: true, message: 'Ignored event type' });
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

  // subscription.halted / subscription.cancelled: reconcile profile state
  if (parsed.event === 'subscription.halted' || parsed.event === 'subscription.cancelled') {
    const sub = parsed.payload?.subscription?.entity;
    const subId = sub?.id;
    if (!subId) {
      return NextResponse.json({ ok: true, message: 'Missing subscription id' });
    }
    const { error: profErr } = await admin
      .from('profiles')
      .update({ razorpay_subscription_id: null, auto_renew_enabled: false })
      .eq('razorpay_subscription_id', subId);
    if (profErr) {
      logger.warn('Razorpay webhook: profile reconcile failed', {
        event: parsed.event,
        subscriptionId: subId,
        error: profErr.message,
      });
    }
    // Also clear subscription id off any pending weekly_policies so retries don't attach to the dead mandate.
    await admin
      .from('weekly_policies')
      .update({ razorpay_subscription_id: null, updated_at: new Date().toISOString() })
      .eq('razorpay_subscription_id', subId)
      .eq('payment_status', 'pending');
    await admin.from('system_logs').insert({
      event_type: `razorpay_${parsed.event.replace('.', '_')}`,
      severity: 'info',
      metadata: { subscription_id: subId, status: sub?.status ?? null },
    });
    return NextResponse.json({ ok: true, message: 'Subscription reconciled' });
  }

  const entity = parsed.payload?.payment?.entity;
  const paymentId = entity?.id;
  const orderId = entity?.order_id;
  const subscriptionId = entity?.subscription_id;
  const method = entity?.method != null ? String(entity.method) : undefined;

  if (!paymentId) {
    return NextResponse.json({ ok: true, message: 'Missing payment id' });
  }

  // payment.failed: mark associated pending weekly_policy / payment_transaction as failed
  if (parsed.event === 'payment.failed') {
    if (!orderId) {
      return NextResponse.json({ ok: true, message: 'Missing order id' });
    }
    const { data: policy } = await admin
      .from('weekly_policies')
      .select('id')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();
    if (policy?.id) {
      await admin
        .from('weekly_policies')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', policy.id)
        .eq('payment_status', 'pending');
      await admin
        .from('payment_transactions')
        .update({ status: 'failed' })
        .eq('weekly_policy_id', policy.id)
        .eq('status', 'pending');
    }
    await admin.from('system_logs').insert({
      event_type: 'razorpay_payment_failed',
      severity: 'warning',
      metadata: {
        order_id: orderId,
        payment_id: paymentId,
        error_code: entity?.error_code ?? null,
        error_description: entity?.error_description ?? null,
      },
    });
    return NextResponse.json({ ok: true, message: 'Payment failure recorded' });
  }

  if (entity?.status && entity.status !== 'captured') {
    return NextResponse.json({ ok: true, message: 'Payment not captured' });
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
    await admin.from('system_logs').insert({
      event_type: 'razorpay_webhook_amount_mismatch',
      severity: 'error',
      metadata: {
        policy_id: policy.id,
        profile_id: policy.profile_id,
        payment_id: paymentId,
        order_id: orderId,
        expected_paise: expectedPaise,
        got_paise: entity.amount,
      },
    });
    // Non-2xx so Razorpay retries and we can investigate.
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
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
