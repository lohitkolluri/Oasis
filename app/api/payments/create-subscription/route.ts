/**
 * Creates a Razorpay subscription (weekly mandate / UPI Autopay) and a pending weekly_policy row.
 * Client opens Checkout with subscription_id (not order_id).
 */
import { RATE_LIMITS } from '@/lib/config/constants';
import { getRazorpayKeyId } from '@/lib/config/env';
import { getRazorpayInstance } from '@/lib/clients/razorpay';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSchema } from '@/lib/validations/schemas';
import { parseWithSchema } from '@/lib/validations/parse';
import { checkRateLimit, errorResponse, rateLimitKey } from '@/lib/utils/api';
import { getPolicyWeekRange } from '@/lib/utils/policy-week';
import { resolveWeeklyPremiumInrForPlan } from '@/lib/ml/resolve-dynamic-plan-quotes';
import { NextResponse } from 'next/server';

const SUBSCRIPTION_TOTAL_WEEKS = 104;

export async function POST(request: Request) {
  const limitKey = rateLimitKey(request, 'payment-subscription');
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
    const { start: weekStart, end: weekEnd } = getPolicyWeekRange();

    const admin = createAdminClient();

    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id, full_name, phone_number, razorpay_customer_id, auto_renew_enabled, razorpay_subscription_id')
      .eq('id', user.id)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    if (profile.auto_renew_enabled && profile.razorpay_subscription_id) {
      return NextResponse.json(
        { error: 'You already have automatic renewal enabled. Cancel it first to start a new mandate.' },
        { status: 400 },
      );
    }

    const planPackageId = planId;
    let amountInr: number;
    let planRow: {
      name: string;
      slug: string;
      weekly_premium_inr: number;
      razorpay_plan_id: string | null;
    } | null = null;

    if (planPackageId) {
      const { data: plan, error: planErr } = await admin
        .from('plan_packages')
        .select('id, weekly_premium_inr, is_active, name, razorpay_plan_id, slug')
        .eq('id', planPackageId)
        .single();

      if (planErr || !plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      if (!plan.is_active) {
        return NextResponse.json({ error: 'Plan is not active' }, { status: 400 });
      }
      planRow = {
        name: plan.name,
        slug: plan.slug,
        weekly_premium_inr: Number(plan.weekly_premium_inr),
        razorpay_plan_id: plan.razorpay_plan_id ?? null,
      };
      amountInr = await resolveWeeklyPremiumInrForPlan(admin, user.id, plan.slug, weekStart);
    } else {
      amountInr = await resolveWeeklyPremiumInrForPlan(admin, user.id, 'standard', weekStart);
    }

    if (!amountInr || amountInr <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const razorpay = getRazorpayInstance();
    getRazorpayKeyId();

    if (profile.razorpay_subscription_id && !profile.auto_renew_enabled) {
      try {
        await razorpay.subscriptions.cancel(profile.razorpay_subscription_id);
      } catch {
        /* stale or already cancelled */
      }
      await admin
        .from('profiles')
        .update({ razorpay_subscription_id: null, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    let customerId = profile.razorpay_customer_id;
    if (!customerId) {
      // Razorpay expects string "0"|"1" for fail_existing; numeric 0 can be treated as default "1" → duplicate customer errors after DB resets.
      const customer = await razorpay.customers.create({
        name: profile.full_name ?? user.email?.split('@')[0] ?? 'Rider',
        email: user.email ?? undefined,
        contact: profile.phone_number ?? undefined,
        fail_existing: '0',
        notes: { profile_id: user.id },
      } as unknown as Parameters<ReturnType<typeof getRazorpayInstance>['customers']['create']>[0]);
      customerId = customer.id;
      await admin
        .from('profiles')
        .update({ razorpay_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    let razorpayPlanId: string | null = null;
    if (planPackageId && planRow) {
      const staticInr = planRow.weekly_premium_inr;
      const useCachedPlan =
        Boolean(planRow.razorpay_plan_id) && Math.round(amountInr) === Math.round(staticInr);

      if (useCachedPlan && planRow.razorpay_plan_id) {
        razorpayPlanId = planRow.razorpay_plan_id;
      } else {
        const planRes = await razorpay.plans.create({
          period: 'weekly',
          interval: 1,
          item: {
            name: `Oasis ${planRow.name}`,
            amount: Math.round(amountInr * 100),
            currency: 'INR',
            description: 'Weekly parametric income protection',
          },
          notes: { plan_package_id: planPackageId, dynamic_premium: String(Math.round(amountInr) !== Math.round(staticInr)) },
        });
        razorpayPlanId = planRes.id;
        if (Math.round(amountInr) === Math.round(staticInr)) {
          await admin
            .from('plan_packages')
            .update({ razorpay_plan_id: razorpayPlanId })
            .eq('id', planPackageId);
        }
      }
    } else {
      const planRes = await razorpay.plans.create({
        period: 'weekly',
        interval: 1,
        item: {
          name: 'Oasis Weekly Default',
          amount: Math.round(amountInr * 100),
          currency: 'INR',
          description: 'Weekly parametric income protection',
        },
        notes: { profile_id: user.id },
      });
      razorpayPlanId = planRes.id;
    }

    /* Razorpay API requires customer_id; SDK types omit it on the create body. */
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId!,
      customer_id: customerId,
      total_count: SUBSCRIPTION_TOTAL_WEEKS,
      customer_notify: 1,
      notes: {
        profile_id: user.id,
        ...(planPackageId ? { plan_id: planPackageId } : {}),
      },
    } as never);

    const subId = subscription.id as string;

    const { data: policy, error: policyError } = await supabase
      .from('weekly_policies')
      .insert({
        profile_id: user.id,
        plan_id: planPackageId || null,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        weekly_premium_inr: amountInr,
        is_active: false,
        payment_status: 'pending',
        razorpay_subscription_id: subId,
      })
      .select('id')
      .single();

    if (policyError || !policy) {
      try {
        await razorpay.subscriptions.cancel(subId);
      } catch {
        /* best effort */
      }
      return NextResponse.json(
        { error: policyError?.message ?? 'Failed to create policy' },
        { status: 500 },
      );
    }

    await supabase.from('payment_transactions').insert({
      profile_id: user.id,
      weekly_policy_id: policy.id,
      amount_inr: amountInr,
      status: 'pending',
    });

    await admin
      .from('profiles')
      .update({
        razorpay_subscription_id: subId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({
      keyId: getRazorpayKeyId(),
      subscriptionId: subId,
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      policyId: policy.id,
      name: 'Oasis Weekly Coverage',
      description: `Weekly coverage · ${weekStart} – ${weekEnd}`,
      prefill: {
        email: user.email ?? undefined,
        name:
          profile.full_name ??
          (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined),
        contact: profile.phone_number ?? undefined,
      },
    });
  } catch (err) {
    return errorResponse(err, 'Failed to create subscription');
  }
}
