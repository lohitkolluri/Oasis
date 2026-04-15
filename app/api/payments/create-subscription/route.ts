/**
 * Creates a Razorpay subscription (weekly mandate / UPI Autopay) and a pending weekly_policy row.
 * Client opens Checkout with subscription_id (not order_id).
 */
import { getRazorpayInstance } from '@/lib/clients/razorpay';
import { PAYMENTS, RATE_LIMITS } from '@/lib/config/constants';
import { getRazorpayKeyId } from '@/lib/config/env';
import { resolveWeeklyPremiumInrForPlan } from '@/lib/ml/resolve-dynamic-plan-quotes';
import { expireStalePendingWeeklyPolicies } from '@/lib/payments/expire-stale-pending-checkout';
import { resolvePendingSubscriptionCheckout } from '@/lib/payments/resolve-pending-subscription-checkout';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, errorResponse, rateLimitKey } from '@/lib/utils/api';
import { getCoverageWeekRange } from '@/lib/utils/policy-week';
import { parseWithSchema } from '@/lib/validations/parse';
import { createCheckoutSchema } from '@/lib/validations/schemas';
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
    const { start: weekStart, end: weekEnd } = getCoverageWeekRange();

    const admin = createAdminClient();

    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select(
        'id, full_name, phone_number, razorpay_customer_id, auto_renew_enabled, razorpay_subscription_id',
      )
      .eq('id', user.id)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    if (profile.auto_renew_enabled && profile.razorpay_subscription_id) {
      return NextResponse.json(
        {
          error:
            'You already have automatic renewal enabled. Cancel it first to start a new mandate.',
        },
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
          notes: {
            plan_package_id: planPackageId,
            dynamic_premium: String(Math.round(amountInr) !== Math.round(staticInr)),
          },
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
    let weekRow: {
      id: string;
      is_active: boolean | null;
      payment_status: string | null;
      razorpay_subscription_id: string | null;
    } | null = null;

    for (let pass = 0; pass < 3; pass++) {
      await expireStalePendingWeeklyPolicies(admin, user.id, weekStart);

      const { data: wr } = await admin
        .from('weekly_policies')
        .select('id, is_active, payment_status, razorpay_subscription_id')
        .eq('profile_id', user.id)
        .eq('week_start_date', weekStart)
        .maybeSingle();

      weekRow = wr;

      if (weekRow?.is_active) {
        return NextResponse.json(
          {
            error: 'You already have active coverage for this week.',
            policyId: weekRow.id,
          },
          { status: 400 },
        );
      }

      if (weekRow?.payment_status === 'pending') {
        const subRes = await resolvePendingSubscriptionCheckout({
          admin,
          razorpay,
          user,
          weekRow,
          amountInr,
          weekStart,
          weekEnd,
          profile: {
            full_name: profile.full_name,
            phone_number: profile.phone_number,
          },
        });

        if (subRes.kind === 'resume') {
          return NextResponse.json(subRes.body);
        }
        continue;
      }

      break;
    }

    if (weekRow?.payment_status === 'pending') {
      return NextResponse.json(
        {
          error: 'Could not resume mandate checkout. Try again in a few seconds.',
          policyId: weekRow.id,
          hint: `If checkout is still open, complete it or wait ${Math.ceil(PAYMENTS.PENDING_CHECKOUT_TTL_MS / 1000)}s and retry.`,
        },
        { status: 409 },
      );
    }

    if (weekRow?.payment_status === 'paid' || weekRow?.payment_status === 'demo') {
      return NextResponse.json(
        {
          error: 'You already have coverage for this week.',
          policyId: weekRow.id,
        },
        { status: 400 },
      );
    }

    let policy: { id: string } | undefined;

    if (!weekRow) {
      const { data: inserted, error: policyError } = await supabase
        .from('weekly_policies')
        .insert({
          profile_id: user.id,
          plan_id: planPackageId || null,
          week_start_date: weekStart,
          week_end_date: weekEnd,
          weekly_premium_inr: amountInr,
          is_active: false,
          payment_status: 'pending',
        })
        .select('id')
        .single();

      if (policyError || !inserted) {
        if ((policyError as { code?: string } | null)?.code === '23505') {
          await expireStalePendingWeeklyPolicies(admin, user.id, weekStart);
          const { data: afterRace } = await admin
            .from('weekly_policies')
            .select('id, is_active, payment_status, razorpay_subscription_id')
            .eq('profile_id', user.id)
            .eq('week_start_date', weekStart)
            .maybeSingle();

          if (afterRace?.payment_status === 'pending' && afterRace.id) {
            const raced = await resolvePendingSubscriptionCheckout({
              admin,
              razorpay,
              user,
              weekRow: afterRace,
              amountInr,
              weekStart,
              weekEnd,
              profile: {
                full_name: profile.full_name,
                phone_number: profile.phone_number,
              },
            });
            if (raced.kind === 'resume') {
              return NextResponse.json(raced.body);
            }
          }

          if (afterRace?.payment_status === 'failed' && afterRace.id) {
            const { error: reviveErr } = await admin
              .from('weekly_policies')
              .update({
                payment_status: 'pending',
                plan_id: planPackageId || null,
                week_end_date: weekEnd,
                weekly_premium_inr: amountInr,
                is_active: false,
                razorpay_order_id: null,
                razorpay_payment_id: null,
                razorpay_subscription_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', afterRace.id)
              .eq('profile_id', user.id)
              .eq('payment_status', 'failed');

            if (!reviveErr) {
              policy = { id: afterRace.id };
            }
          }

          if (!policy) {
            return NextResponse.json(
              {
                error: afterRace?.is_active
                  ? 'You already have active coverage for this week.'
                  : 'You already have a pending mandate/checkout for this week. Complete it first.',
                policyId: afterRace?.id,
              },
              { status: 409 },
            );
          }
        } else {
          return NextResponse.json(
            { error: policyError?.message ?? 'Failed to create policy' },
            { status: 500 },
          );
        }
      } else {
        policy = inserted;
      }
    } else if (weekRow.payment_status === 'failed') {
      const { error: reviveErr } = await admin
        .from('weekly_policies')
        .update({
          payment_status: 'pending',
          plan_id: planPackageId || null,
          week_end_date: weekEnd,
          weekly_premium_inr: amountInr,
          is_active: false,
          razorpay_order_id: null,
          razorpay_payment_id: null,
          razorpay_subscription_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', weekRow.id)
        .eq('profile_id', user.id)
        .eq('payment_status', 'failed');

      if (reviveErr) {
        return NextResponse.json(
          { error: reviveErr.message ?? 'Could not restart mandate checkout' },
          { status: 500 },
        );
      }
      policy = { id: weekRow.id };
    } else {
      return NextResponse.json(
        { error: 'Unable to start mandate checkout for this coverage week.' },
        { status: 400 },
      );
    }

    if (!policy) {
      return NextResponse.json(
        { error: 'Failed to reserve policy row for mandate.' },
        { status: 500 },
      );
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId!,
      customer_id: customerId,
      total_count: SUBSCRIPTION_TOTAL_WEEKS,
      customer_notify: 1,
      notes: {
        profile_id: user.id,
        policy_id: policy.id,
        ...(planPackageId ? { plan_id: planPackageId } : {}),
      },
    } as never);

    const subId = subscription.id as string;

    const { error: linkErr } = await admin
      .from('weekly_policies')
      .update({ razorpay_subscription_id: subId, updated_at: new Date().toISOString() })
      .eq('id', policy.id)
      .eq('profile_id', user.id);

    if (linkErr) {
      try {
        await razorpay.subscriptions.cancel(subId);
      } catch {
        /* best effort */
      }
      await admin.from('weekly_policies').delete().eq('id', policy.id).eq('profile_id', user.id);
      return NextResponse.json({ error: 'Failed to link mandate to policy' }, { status: 500 });
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
          (typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : undefined),
        contact: profile.phone_number ?? undefined,
      },
    });
  } catch (err) {
    return errorResponse(err, 'Failed to create subscription');
  }
}
