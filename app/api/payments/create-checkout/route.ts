/**
 * POST /api/payments/create-checkout
 * Creates a Stripe Checkout Session for weekly premium payment.
 * Creates a Stripe Checkout Session for weekly policy payment.
 */
import { RATE_LIMITS } from '@/lib/config/constants';
import { getAppUrl, getStripeSecretKey } from '@/lib/config/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSchema } from '@/lib/validations/schemas';
import { parseWithSchema } from '@/lib/validations/parse';
import { checkRateLimit, errorResponse, rateLimitKey } from '@/lib/utils/api';
import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/clients/stripe';

export async function POST(request: Request) {
  const limitKey = rateLimitKey(request, 'payment-create');
  const rateLimited = await checkRateLimit(limitKey, {
    maxRequests: RATE_LIMITS.PAYMENTS_PER_MINUTE,
  });
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = parseWithSchema(createCheckoutSchema, body);
    if (!parsed.success) return parsed.response;
    const { planId, weekStart, weekEnd } = parsed.data;

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
    // Production: use only canonical app URL to avoid redirect abuse; never trust Origin/Referer.
    let baseUrl: string;
    try {
      if (process.env.NODE_ENV === 'production') {
        baseUrl = getAppUrl();
      } else {
        baseUrl = getAppUrl();
        if (origin) baseUrl = origin.replace(/\/$/, '');
        else {
          const referer = request.headers.get('referer');
          if (referer) {
            try {
              baseUrl = new URL(referer).origin;
            } catch {
              /* keep getAppUrl() default */
            }
          }
        }
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message?.includes('NEXT_PUBLIC_APP_URL')
          ? 'App URL not configured. Set NEXT_PUBLIC_APP_URL in production for Stripe redirects.'
          : process.env.NODE_ENV === 'production'
            ? 'App URL not configured.'
            : (e instanceof Error ? e.message : 'Configuration error');
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    const amountPaise = Math.round(amountInr * 100); // Stripe uses smallest currency unit for INR

    // Ensure secret is present and valid; throws in production if missing.
    getStripeSecretKey();

    const session = await createCheckoutSession({
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
