/**
 * POST /api/payments/create-checkout
 * Creates a Stripe Checkout Session for weekly premium payment.
 * Replaces Razorpay create-order.
 */
import { RATE_LIMITS } from '@/lib/config/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, errorResponse, rateLimitKey } from '@/lib/utils/api';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const limitKey = rateLimitKey(request, 'payment-create');
  const rateLimited = checkRateLimit(limitKey, {
    maxRequests: RATE_LIMITS.PAYMENTS_PER_MINUTE,
  });
  if (rateLimited) return rateLimited;

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecret) {
    return NextResponse.json(
      {
        error:
          'Stripe not configured. Add STRIPE_SECRET_KEY (sk_test_... from Stripe Dashboard) to use Stripe Checkout.',
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { planId, weekStart, weekEnd } = body as {
      planId?: string;
      weekStart?: string;
      weekEnd?: string;
    };

    if (!weekStart || !weekEnd) {
      return NextResponse.json({ error: 'Week dates required' }, { status: 400 });
    }

    let amountInr: number;
    if (planId) {
      const admin = createAdminClient();
      const { data: plan, error: planErr } = await admin
        .from('plan_packages')
        .select('weekly_premium_inr, is_active')
        .eq('id', planId)
        .single();

      if (planErr || !plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      if (!plan.is_active) {
        return NextResponse.json({ error: 'Plan is not active' }, { status: 400 });
      }
      amountInr = Number(plan.weekly_premium_inr);
    } else {
      amountInr = 79;
    }

    if (!amountInr || amountInr <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const { data: policy, error: policyError } = await supabase
      .from('weekly_policies')
      .insert({
        profile_id: user.id,
        plan_id: planId || null,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        weekly_premium_inr: amountInr,
        is_active: false,
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (policyError || !policy) {
      return NextResponse.json(
        { error: policyError?.message ?? 'Failed to create policy' },
        { status: 500 },
      );
    }

    const origin = request.headers.get('origin');
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    if (origin) baseUrl = origin.replace(/\/$/, '');
    else {
      const referer = request.headers.get('referer');
      if (referer)
        try {
          baseUrl = new URL(referer).origin;
        } catch {
          /* use default */
        }
    }

    const stripe = new Stripe(stripeSecret!);
    const amountPaise = Math.round(amountInr * 100); // Stripe uses smallest currency unit for INR

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      currency: 'inr',
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Oasis Weekly Coverage',
              description: `Parametric insurance ${weekStart} – ${weekEnd}`,
              images: origin ? undefined : undefined,
            },
            unit_amount: amountPaise,
          },
          quantity: 1,
        },
      ],
      metadata: {
        profile_id: user.id,
        policy_id: policy.id,
        week_start: weekStart,
        week_end: weekEnd,
      },
      success_url: `${baseUrl}/dashboard/policy?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/policy?canceled=1`,
      customer_email: user.email ?? undefined,
    });

    await supabase
      .from('weekly_policies')
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', policy.id);

    await supabase.from('payment_transactions').insert({
      profile_id: user.id,
      weekly_policy_id: policy.id,
      amount_inr: amountInr,
      stripe_checkout_session_id: session.id,
      status: 'pending',
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      policyId: policy.id,
    });
  } catch (err) {
    return errorResponse(err, 'Failed to create checkout');
  }
}
