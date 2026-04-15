/**
 * When weekly_policies is still `pending`, either resume the same Razorpay Standard Checkout,
 * sync DB if Razorpay already captured payment, or release the row so a new checkout can start.
 */
import type { getRazorpayInstance } from '@/lib/clients/razorpay';
import { getRazorpayKeyId } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type PendingOrderResolution =
  | { kind: 'resume'; body: Record<string, unknown> }
  | { kind: 'synced' }
  | { kind: 'sync_failed' }
  | { kind: 'cleared' };

type Razorpay = ReturnType<typeof getRazorpayInstance>;

export async function markPendingWeeklyPolicyAbandoned(
  admin: SupabaseClient,
  policyId: string,
  profileId: string,
): Promise<boolean> {
  const { error } = await admin
    .from('weekly_policies')
    .update({
      payment_status: 'failed',
      razorpay_order_id: null,
      razorpay_payment_id: null,
      razorpay_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', policyId)
    .eq('profile_id', profileId)
    .eq('payment_status', 'pending');

  if (error) {
    logger.warn('markPendingWeeklyPolicyAbandoned: weekly_policies update failed', {
      policyId,
      message: error.message,
    });
    return false;
  }

  const { error: txErr } = await admin
    .from('payment_transactions')
    .update({ status: 'failed' })
    .eq('weekly_policy_id', policyId)
    .eq('status', 'pending');

  if (txErr) {
    logger.warn('markPendingWeeklyPolicyAbandoned: payment_transactions update failed', {
      policyId,
      message: txErr.message,
    });
  }

  return true;
}

async function tryActivateFromCapturedPayments(
  admin: SupabaseClient,
  razorpay: Razorpay,
  orderId: string,
  policy: { id: string; profile_id: string; weekly_premium_inr: number | string | null },
): Promise<boolean> {
  let items: Array<Record<string, unknown>>;
  try {
    const res = await razorpay.orders.fetchPayments(orderId);
    items = (res.items ?? []) as unknown as Array<Record<string, unknown>>;
  } catch (err) {
    logger.warn('tryActivateFromCapturedPayments: fetchPayments failed', {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }

  const expectedPaise = Math.round(Number(policy.weekly_premium_inr) * 100);
  const captured = items.find((p) => {
    const st = typeof p.status === 'string' ? p.status : '';
    if (st !== 'captured' && st !== 'authorized') return false;
    const amt = p.amount != null ? Number(p.amount) : null;
    if (amt != null && amt !== expectedPaise) return false;
    return typeof p.id === 'string' && p.id.length > 0;
  });

  const paymentId = typeof captured?.id === 'string' ? captured.id : null;
  if (!paymentId) {
    return false;
  }

  const method = captured && captured.method != null ? String(captured.method) : null;
  const { data: result, error: rpcError } = await admin.rpc('process_razorpay_payment_event', {
    p_payment_id: paymentId,
    p_policy_id: policy.id,
    p_order_id: orderId,
    p_profile_id: policy.profile_id,
    p_amount_inr: Number(policy.weekly_premium_inr),
    p_payment_method: method,
  });

  if (rpcError) {
    logger.error('tryActivateFromCapturedPayments: RPC failed', {
      policy_id: policy.id,
      error: rpcError.message,
    });
    return false;
  }

  const status = Array.isArray(result) ? result[0] : result;
  return status === 'ok' || status === 'already_processed';
}

export async function resolvePendingOrderCheckout(params: {
  admin: SupabaseClient;
  razorpay: Razorpay;
  user: User;
  weekRow: {
    id: string;
    profile_id: string;
    razorpay_order_id: string | null;
    weekly_premium_inr: number | string | null;
  };
  expectedAmountInr: number;
  weekStart: string;
  weekEnd: string;
}): Promise<PendingOrderResolution> {
  const { admin, razorpay, user, weekRow, expectedAmountInr, weekStart, weekEnd } = params;
  const oid = weekRow.razorpay_order_id?.trim();

  if (!oid) {
    await markPendingWeeklyPolicyAbandoned(admin, weekRow.id, user.id);
    return { kind: 'cleared' };
  }

  let order: {
    id: string;
    amount?: number;
    currency?: string;
    status: string;
    amount_paid?: number;
    amount_due?: number;
  };
  try {
    order = (await razorpay.orders.fetch(oid)) as typeof order;
  } catch (err) {
    logger.warn('resolvePendingOrderCheckout: orders.fetch failed', {
      orderId: oid,
      error: err instanceof Error ? err.message : String(err),
    });
    await markPendingWeeklyPolicyAbandoned(admin, weekRow.id, user.id);
    return { kind: 'cleared' };
  }

  const storedPaise = Math.round(Number(weekRow.weekly_premium_inr) * 100);
  const orderAmountPaise = Math.round(Number(order.amount));
  if (orderAmountPaise !== storedPaise) {
    await markPendingWeeklyPolicyAbandoned(admin, weekRow.id, user.id);
    return { kind: 'cleared' };
  }

  const expectedPaise = Math.round(expectedAmountInr * 100);
  if (expectedPaise !== storedPaise) {
    await markPendingWeeklyPolicyAbandoned(admin, weekRow.id, user.id);
    return { kind: 'cleared' };
  }

  const fullyPaidAtGateway =
    order.status === 'paid' ||
    (orderAmountPaise > 0 && Number(order.amount_paid ?? 0) >= orderAmountPaise);

  if (fullyPaidAtGateway) {
    const synced = await tryActivateFromCapturedPayments(admin, razorpay, oid, {
      id: weekRow.id,
      profile_id: weekRow.profile_id,
      weekly_premium_inr: weekRow.weekly_premium_inr,
    });
    if (synced) {
      return { kind: 'synced' };
    }
    if (order.status === 'paid') {
      return { kind: 'sync_failed' };
    }
  }

  if (order.status === 'created' || order.status === 'attempted') {
    const due = Number(order.amount_due ?? orderAmountPaise);
    if (due > 0 || order.status === 'created') {
      return {
        kind: 'resume',
        body: {
          keyId: getRazorpayKeyId(),
          orderId: order.id,
          amount: order.amount,
          currency: order.currency ?? 'INR',
          policyId: weekRow.id,
          name: 'Oasis Weekly Coverage',
          description: `Parametric insurance ${weekStart} – ${weekEnd}`,
          prefill: {
            email: user.email ?? undefined,
            name: user.user_metadata?.full_name as string | undefined,
          },
          resumed: true,
        },
      };
    }
  }

  await markPendingWeeklyPolicyAbandoned(admin, weekRow.id, user.id);
  return { kind: 'cleared' };
}
