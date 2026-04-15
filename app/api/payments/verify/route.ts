/**
 * POST /api/payments/verify
 * Validates Razorpay payment signature, confirms payment with Razorpay API, activates policy.
 */
import { getRazorpayInstance } from '@/lib/clients/razorpay';
import { getRazorpayKeySecret } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { verifyRazorpayPaymentSignature } from '@/lib/payments/razorpay-crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitKey } from '@/lib/utils/api';
import { jsonWithRequestId } from '@/lib/utils/request-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const limitKey = rateLimitKey(request, 'payment-verify');
  const rateLimited = await checkRateLimit(limitKey, { maxRequests: 20, request });
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonWithRequestId(request, { error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonWithRequestId(request, { error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonWithRequestId(request, { error: 'Invalid payload' }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  const secret = getRazorpayKeySecret();

  if (
    !verifyRazorpayPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret,
    )
  ) {
    return jsonWithRequestId(request, { error: 'Invalid signature' }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    logger.error('Razorpay verify: Supabase not configured', {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonWithRequestId(request, { error: 'Service unavailable' }, { status: 503 });
  }

  const razorpay = getRazorpayInstance();
  type FetchedPayment = {
    order_id?: string;
    status?: string;
    amount?: number;
    method?: string;
  };
  let payment: FetchedPayment;
  try {
    payment = (await razorpay.payments.fetch(razorpay_payment_id)) as FetchedPayment;
  } catch (err) {
    logger.warn('Razorpay verify: payments.fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonWithRequestId(request, { error: 'Could not confirm payment' }, { status: 502 });
  }

  if (payment.order_id !== razorpay_order_id) {
    return jsonWithRequestId(request, { error: 'Order mismatch' }, { status: 400 });
  }

  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    return jsonWithRequestId(
      request,
      { error: `Payment not completed (status: ${payment.status})` },
      { status: 400 },
    );
  }

  const { data: policy, error: policyErr } = await admin
    .from('weekly_policies')
    .select('id, profile_id, weekly_premium_inr, razorpay_order_id')
    .eq('razorpay_order_id', razorpay_order_id)
    .eq('profile_id', user.id)
    .single();

  if (policyErr || !policy) {
    return jsonWithRequestId(
      request,
      { error: 'Policy not found for this order' },
      { status: 404 },
    );
  }

  const expectedPaise = Math.round(Number(policy.weekly_premium_inr) * 100);
  if (Number(payment.amount) !== expectedPaise) {
    logger.error('Razorpay verify: amount mismatch', {
      policy_id: policy.id,
      expected: expectedPaise,
      got: payment.amount,
    });
    return jsonWithRequestId(request, { error: 'Amount mismatch' }, { status: 400 });
  }

  const method = payment.method != null ? String(payment.method) : null;

  const { data: result, error: rpcError } = await admin.rpc('process_razorpay_payment_event', {
    p_payment_id: razorpay_payment_id,
    p_policy_id: policy.id,
    p_order_id: razorpay_order_id,
    p_profile_id: policy.profile_id,
    p_amount_inr: Number(policy.weekly_premium_inr),
    p_payment_method: method,
  });

  if (rpcError) {
    logger.error('Razorpay verify: process_razorpay_payment_event failed', {
      error: rpcError.message,
      policy_id: policy.id,
    });
    return jsonWithRequestId(request, { error: rpcError.message }, { status: 500 });
  }

  const status = Array.isArray(result) ? result[0] : result;
  return jsonWithRequestId(request, {
    ok: true,
    alreadyProcessed: status === 'already_processed',
  });
}
