/**
 * Creates a Razorpay order for weekly premium coverage and returns checkout options
 * for Razorpay Standard Checkout (client opens modal).
 */
import { getRazorpayInstance } from '@/lib/clients/razorpay';
import { RATE_LIMITS } from '@/lib/config/constants';
import { getRazorpayKeyId } from '@/lib/config/env';
import { resolveWeeklyPremiumInrForPlan } from '@/lib/ml/resolve-dynamic-plan-quotes';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, errorResponse, rateLimitKey } from '@/lib/utils/api';
import { getCoverageWeekRange } from '@/lib/utils/policy-week';
import { parseWithSchema } from '@/lib/validations/parse';
import { createCheckoutSchema } from '@/lib/validations/schemas';
import { NextResponse } from 'next/server';

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
    const { planId } = parsed.data;
    const admin = createAdminClient();
    const { start: weekStart, end: weekEnd } = getCoverageWeekRange();

    // Race-condition guard: prevent duplicate pending/active policy for same profile + week.
    const { data: existingPolicy } = await admin
      .from('weekly_policies')
      .select('id, is_active, payment_status')
      .eq('profile_id', user.id)
      .eq('week_start_date', weekStart);

    if (existingPolicy && existingPolicy.length > 0) {
      const active = existingPolicy.find((p) => p.is_active);
      if (active) {
        return NextResponse.json(
          {
            error: 'You already have active coverage for this week.',
            policyId: active.id,
          },
          { status: 400 },
        );
      }
      const pending = existingPolicy.find((p) => p.payment_status === 'pending');
      if (pending) {
        return NextResponse.json(
          {
            error: 'You already have a pending checkout for this week. Complete payment first.',
            policyId: pending.id,
          },
          { status: 409 },
        );
      }
    }

    let amountInr: number;
    if (planId) {
      const { data: plan, error: planErr } = await admin
        .from('plan_packages')
        .select('weekly_premium_inr, is_active, slug')
        .eq('id', planId)
        .single();

      if (planErr || !plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      if (!plan.is_active) {
        return NextResponse.json({ error: 'Plan is not active' }, { status: 400 });
      }
      amountInr = await resolveWeeklyPremiumInrForPlan(admin, user.id, plan.slug, weekStart);
    } else {
      amountInr = await resolveWeeklyPremiumInrForPlan(admin, user.id, 'standard', weekStart);
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
      // If a concurrent request already created the policy for this rider/week, return that instead.
      if ((policyError as { code?: string } | null)?.code === '23505') {
        const { data: existing } = await admin
          .from('weekly_policies')
          .select('id, is_active, payment_status')
          .eq('profile_id', user.id)
          .eq('week_start_date', weekStart)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          return NextResponse.json(
            {
              error: existing.is_active
                ? 'You already have active coverage for this week.'
                : 'You already have a pending checkout for this week. Complete payment first.',
              policyId: existing.id,
            },
            { status: 409 },
          );
        }
      }
      return NextResponse.json(
        { error: policyError?.message ?? 'Failed to create policy' },
        { status: 500 },
      );
    }

    const amountPaise = Math.round(amountInr * 100);

    getRazorpayKeyId();

    const razorpay = getRazorpayInstance();
    const receipt = `oasis_${policy.id.replace(/-/g, '').slice(0, 32)}`;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        policy_id: policy.id,
        profile_id: user.id,
        week_start: weekStart,
        week_end: weekEnd,
      },
    });

    await supabase
      .from('weekly_policies')
      .update({
        razorpay_order_id: order.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', policy.id);

    await supabase.from('payment_transactions').insert({
      profile_id: user.id,
      weekly_policy_id: policy.id,
      amount_inr: amountInr,
      razorpay_order_id: order.id,
      status: 'pending',
    });

    return NextResponse.json({
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      policyId: policy.id,
      name: 'Oasis Weekly Coverage',
      description: `Parametric insurance ${weekStart} – ${weekEnd}`,
      prefill: {
        email: user.email ?? undefined,
        name: user.user_metadata?.full_name as string | undefined,
      },
    });
  } catch (err) {
    return errorResponse(err, 'Failed to create checkout');
  }
}
