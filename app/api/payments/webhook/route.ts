/**
 * POST /api/payments/webhook
 * Stripe server-to-server webhook for checkout.session.completed.
 * Configure this URL in Stripe Dashboard → Developers → Webhooks.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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
  const paymentIntentId = session.payment_intent as string | null;

  if (!policyId) {
    return NextResponse.json({ ok: true, message: 'No policy_id in metadata' });
  }

  const admin = createAdminClient();

  const { data: policy } = await admin
    .from('weekly_policies')
    .select('id, profile_id, weekly_premium_inr')
    .eq('id', policyId)
    .single();

  if (!policy) {
    return NextResponse.json({ ok: true, message: 'Policy not found' });
  }

  await admin
    .from('weekly_policies')
    .update({
      is_active: true,
      stripe_payment_intent_id: paymentIntentId,
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', policy.id);

  const { data: existing } = await admin
    .from('payment_transactions')
    .select('id')
    .eq('weekly_policy_id', policy.id)
    .limit(1)
    .single();

  const paidAt = new Date().toISOString();
  if (existing) {
    await admin
      .from('payment_transactions')
      .update({
        stripe_payment_intent_id: paymentIntentId,
        status: 'paid',
        paid_at: paidAt,
      })
      .eq('id', existing.id);
  } else {
    await admin.from('payment_transactions').insert({
      profile_id: policy.profile_id,
      weekly_policy_id: policy.id,
      amount_inr: policy.weekly_premium_inr,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: 'paid',
      paid_at: paidAt,
    });
  }

  return NextResponse.json({ ok: true });
}
