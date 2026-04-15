/**
 * Creates a Razorpay order for weekly premium coverage and returns checkout options
 * for Razorpay Standard Checkout (client opens modal).
 */
import { getRazorpayInstance } from '@/lib/clients/razorpay';
import { PAYMENTS, RATE_LIMITS } from '@/lib/config/constants';
import { getRazorpayKeyId } from '@/lib/config/env';
import { resolveWeeklyPremiumInrForPlan } from '@/lib/ml/resolve-dynamic-plan-quotes';
import { expireStalePendingWeeklyPolicies } from '@/lib/payments/expire-stale-pending-checkout';
import { resolvePendingOrderCheckout } from '@/lib/payments/resolve-pending-order-checkout';
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
    const razorpay = getRazorpayInstance();
    const { start: weekStart, end: weekEnd } = getCoverageWeekRange();

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

    let weekRow: {
      id: string;
      is_active: boolean | null;
      payment_status: string | null;
      created_at: string;
      razorpay_order_id: string | null;
      weekly_premium_inr: number | string | null;
    } | null = null;

    for (let pass = 0; pass < 3; pass++) {
      await expireStalePendingWeeklyPolicies(admin, user.id, weekStart);

      const { data: wr } = await admin
        .from('weekly_policies')
        .select(
          'id, is_active, payment_status, created_at, razorpay_order_id, weekly_premium_inr, profile_id',
        )
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
        const pending = await resolvePendingOrderCheckout({
          admin,
          razorpay,
          user,
          weekRow: {
            id: weekRow.id,
            profile_id: user.id,
            razorpay_order_id: weekRow.razorpay_order_id,
            weekly_premium_inr: weekRow.weekly_premium_inr,
          },
          expectedAmountInr: amountInr,
          weekStart,
          weekEnd,
        });

        if (pending.kind === 'resume') {
          return NextResponse.json(pending.body);
        }
        if (pending.kind === 'synced') {
          return NextResponse.json({ ok: true, policyActivated: true });
        }
        if (pending.kind === 'sync_failed') {
          return NextResponse.json(
            {
              error:
                'Your payment may already be complete, but we could not activate coverage automatically. Refresh the policy page or contact support.',
            },
            { status: 503 },
          );
        }
        continue;
      }

      break;
    }

    if (weekRow?.payment_status === 'pending') {
      return NextResponse.json(
        {
          error: 'Could not start checkout right now. Try again in a few seconds.',
          policyId: weekRow.id,
          hint: `If payment is still open, complete it or wait ${Math.ceil(PAYMENTS.PENDING_CHECKOUT_TTL_MS / 1000)}s and retry.`,
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

    let policyId: string | undefined;

    if (!weekRow) {
      const { data: inserted, error: policyError } = await supabase
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

      if (policyError || !inserted) {
        if ((policyError as { code?: string } | null)?.code === '23505') {
          await expireStalePendingWeeklyPolicies(admin, user.id, weekStart);
          const { data: afterRace } = await admin
            .from('weekly_policies')
            .select('id, is_active, payment_status, razorpay_order_id, weekly_premium_inr')
            .eq('profile_id', user.id)
            .eq('week_start_date', weekStart)
            .maybeSingle();

          if (afterRace?.payment_status === 'pending' && afterRace.id) {
            const raced = await resolvePendingOrderCheckout({
              admin,
              razorpay,
              user,
              weekRow: {
                id: afterRace.id,
                profile_id: user.id,
                razorpay_order_id: afterRace.razorpay_order_id,
                weekly_premium_inr: afterRace.weekly_premium_inr,
              },
              expectedAmountInr: amountInr,
              weekStart,
              weekEnd,
            });
            if (raced.kind === 'resume') {
              return NextResponse.json(raced.body);
            }
            if (raced.kind === 'synced') {
              return NextResponse.json({ ok: true, policyActivated: true });
            }
            if (raced.kind === 'sync_failed') {
              return NextResponse.json(
                {
                  error:
                    'Your payment may already be complete, but we could not activate coverage automatically. Refresh the policy page or contact support.',
                },
                { status: 503 },
              );
            }
          }

          if (afterRace?.payment_status === 'failed' && afterRace.id) {
            const { error: reviveErr } = await admin
              .from('weekly_policies')
              .update({
                payment_status: 'pending',
                plan_id: planId || null,
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
              policyId = afterRace.id;
            }
          }

          if (policyId === undefined) {
            return NextResponse.json(
              {
                error: afterRace?.is_active
                  ? 'You already have active coverage for this week.'
                  : 'You already have a pending checkout for this week. Complete payment first.',
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
        policyId = inserted.id;
      }
    } else if (weekRow.payment_status === 'failed') {
      const { error: reviveErr } = await admin
        .from('weekly_policies')
        .update({
          payment_status: 'pending',
          plan_id: planId || null,
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
          { error: reviveErr.message ?? 'Could not restart checkout' },
          { status: 500 },
        );
      }
      policyId = weekRow.id;
    } else {
      return NextResponse.json(
        { error: 'Unable to start checkout for this coverage week.' },
        { status: 400 },
      );
    }

    if (policyId === undefined) {
      return NextResponse.json(
        { error: 'Failed to reserve policy row for checkout.' },
        { status: 500 },
      );
    }

    const amountPaise = Math.round(amountInr * 100);

    getRazorpayKeyId();
    const receipt = `oasis_${policyId.replace(/-/g, '').slice(0, 32)}`;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        policy_id: policyId,
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
      .eq('id', policyId);

    await supabase.from('payment_transactions').insert({
      profile_id: user.id,
      weekly_policy_id: policyId,
      amount_inr: amountInr,
      razorpay_order_id: order.id,
      status: 'pending',
    });

    return NextResponse.json({
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      policyId,
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
