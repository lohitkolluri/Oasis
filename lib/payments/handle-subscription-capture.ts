import { getRazorpayInstance } from '@/lib/clients/razorpay';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { getUpcomingCoverageWeek, nextCoverageWeekAfter } from '@/lib/utils/subscription-week';

type Admin = ReturnType<typeof createAdminClient>;

type PaymentEntity = {
  id?: string;
  subscription_id?: string;
  amount?: number;
  status?: string;
  method?: string | null;
};

/**
 * Process Razorpay payment.captured when tied to a subscription (recurring weekly renewal).
 */
export async function handleSubscriptionPaymentCapture(
  admin: Admin,
  entity: PaymentEntity,
): Promise<{ ok: boolean; message?: string; error?: string; status?: number }> {
  const paymentId = entity.id;
  const subscriptionId = entity.subscription_id;
  const method = entity.method != null ? String(entity.method) : null;

  if (!paymentId || !subscriptionId) {
    return { ok: true, message: 'Missing subscription payment fields' };
  }

  if (entity.status && entity.status !== 'captured') {
    return { ok: true, message: 'Payment not captured' };
  }

  const razorpay = getRazorpayInstance();
  type SubRes = {
    notes?: Record<string, string>;
    plan_id?: string;
  };
  let sub: SubRes;
  try {
    sub = (await razorpay.subscriptions.fetch(subscriptionId)) as SubRes;
  } catch (err) {
    logger.error('Subscription webhook: fetch subscription failed', {
      error: err instanceof Error ? err.message : String(err),
      subscriptionId,
    });
    return { ok: false, error: 'Failed to fetch subscription', status: 502 };
  }

  const profileId = sub.notes?.profile_id;
  if (!profileId) {
    logger.warn('Subscription webhook: missing profile_id in notes', { subscriptionId });
    return { ok: true, message: 'No profile in subscription notes' };
  }

  let planPackageId: string | null = sub.notes?.plan_id ?? null;
  if (!planPackageId && sub.plan_id) {
    const { data: pkg } = await admin
      .from('plan_packages')
      .select('id')
      .eq('razorpay_plan_id', sub.plan_id)
      .maybeSingle();
    planPackageId = pkg?.id ?? null;
  }

  const amountInr = entity.amount != null ? Number(entity.amount) / 100 : null;
  if (amountInr == null || amountInr <= 0) {
    return { ok: true, message: 'Missing amount' };
  }

  const { data: pending } = await admin
    .from('weekly_policies')
    .select('id, plan_id, week_start_date, week_end_date, weekly_premium_inr')
    .eq('profile_id', profileId)
    .eq('razorpay_subscription_id', subscriptionId)
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let weekStart: string;
  let weekEnd: string;
  let planIdForRow: string | null;
  let premiumInr: number;

  if (pending) {
    weekStart = pending.week_start_date;
    weekEnd = pending.week_end_date;
    planIdForRow = pending.plan_id;
    premiumInr = Number(pending.weekly_premium_inr);
  } else {
    const { data: last } = await admin
      .from('weekly_policies')
      .select('week_end_date')
      .eq('profile_id', profileId)
      .order('week_end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const next = last?.week_end_date
      ? nextCoverageWeekAfter(last.week_end_date)
      : getUpcomingCoverageWeek();
    weekStart = next.start;
    weekEnd = next.end;
    planIdForRow = planPackageId;
    premiumInr = amountInr;
  }

  const expectedPaise = Math.round(premiumInr * 100);
  if (entity.amount != null && Number(entity.amount) !== expectedPaise) {
    logger.warn('Subscription webhook: amount mismatch', {
      subscriptionId,
      expected: expectedPaise,
      got: entity.amount,
    });
    return { ok: true, message: 'Amount mismatch' };
  }

  const { data: result, error: rpcError } = await admin.rpc('process_razorpay_subscription_payment', {
    p_payment_id: paymentId,
    p_profile_id: profileId,
    p_plan_id: planIdForRow ?? null,
    p_amount_inr: premiumInr,
    p_subscription_id: subscriptionId,
    p_week_start: weekStart,
    p_week_end: weekEnd,
    p_payment_method: method,
  });

  if (rpcError) {
    logger.error('Subscription webhook: RPC failed', {
      error: rpcError.message,
      payment_id: paymentId,
    });
    return { ok: false, error: rpcError.message, status: 500 };
  }

  const status = Array.isArray(result) ? result[0] : result;
  if (status === 'already_processed') {
    return { ok: true, message: 'Already processed' };
  }

  return { ok: true };
}
