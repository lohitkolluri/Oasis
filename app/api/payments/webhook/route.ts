/**
 * POST /api/payments/webhook
 * Stripe server-to-server webhook for checkout.session.completed.
 * Idempotency and policy/payment update happen in one DB transaction via process_stripe_checkout_event.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/lib/clients/stripe';
import { getStripeWebhookSecret } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const isProd = process.env.NODE_ENV === 'production';

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ ok: true, message: 'Ignored event type' });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const policyId = session.metadata?.policy_id;
  const paymentIntentId = (session.payment_intent as string) ?? null;

  if (!policyId) {
    return NextResponse.json({ ok: true, message: 'No policy_id in metadata' });
  }

  let paymentMethodType: string | null = null;
  if (paymentIntentId) {
    try {
      const stripe = getStripeClient();
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['payment_method'],
      });
      const pm = pi.payment_method;
      if (pm && typeof pm !== 'string' && !pm.deleted) {
        paymentMethodType = pm.type ?? null;
      }
    } catch (err) {
      logger.warn('Stripe webhook: could not resolve payment method type', {
        payment_intent: paymentIntentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    logger.error('Stripe webhook: Supabase not configured', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: isProd ? 'Service unavailable' : 'Supabase not configured' },
      { status: 503 },
    );
  }

  const { data: policy } = await admin
    .from('weekly_policies')
    .select('id, profile_id, weekly_premium_inr')
    .eq('id', policyId)
    .single();

  if (!policy) {
    return NextResponse.json({ ok: true, message: 'Policy not found' });
  }

  const { data: result, error: rpcError } = await admin.rpc('process_stripe_checkout_event', {
    p_event_id: event.id,
    p_policy_id: policy.id,
    p_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_profile_id: policy.profile_id,
    p_amount_inr: Number(policy.weekly_premium_inr),
    p_payment_method_type: paymentMethodType,
  });

  if (rpcError) {
    logger.error('Stripe webhook: process_stripe_checkout_event failed', {
      event_id: event.id,
      policy_id: policyId,
      error: rpcError.message,
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
