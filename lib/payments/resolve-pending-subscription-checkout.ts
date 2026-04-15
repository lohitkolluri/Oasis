/**
 * Pending mandate: resume Razorpay subscription checkout or release the policy row.
 */
import type { getRazorpayInstance } from '@/lib/clients/razorpay';
import { getRazorpayKeyId } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { markPendingWeeklyPolicyAbandoned } from '@/lib/payments/resolve-pending-order-checkout';
import type { SupabaseClient, User } from '@supabase/supabase-js';

type Razorpay = ReturnType<typeof getRazorpayInstance>;

export type PendingSubscriptionResolution =
  | {
      kind: 'resume';
      body: Record<string, unknown>;
    }
  | { kind: 'cleared' };

export async function resolvePendingSubscriptionCheckout(params: {
  admin: SupabaseClient;
  razorpay: Razorpay;
  user: User;
  weekRow: { id: string; razorpay_subscription_id: string | null };
  amountInr: number;
  weekStart: string;
  weekEnd: string;
  profile: {
    full_name: string | null;
    phone_number: string | null;
  };
}): Promise<PendingSubscriptionResolution> {
  const { admin, razorpay, user, weekRow, amountInr, weekStart, weekEnd, profile } = params;
  const subId = weekRow.razorpay_subscription_id?.trim();

  if (!subId) {
    await markPendingWeeklyPolicyAbandoned(admin, weekRow.id, user.id);
    await admin
      .from('profiles')
      .update({ razorpay_subscription_id: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    return { kind: 'cleared' };
  }

  let sub: { status: string; id: string };
  try {
    sub = (await razorpay.subscriptions.fetch(subId)) as typeof sub;
  } catch (err) {
    logger.warn('resolvePendingSubscriptionCheckout: subscriptions.fetch failed', {
      subId,
      error: err instanceof Error ? err.message : String(err),
    });
    await markPendingWeeklyPolicyAbandoned(admin, weekRow.id, user.id);
    await admin
      .from('profiles')
      .update({ razorpay_subscription_id: null, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .eq('razorpay_subscription_id', subId);
    return { kind: 'cleared' };
  }

  const resumable =
    sub.status === 'created' || sub.status === 'authenticated' || sub.status === 'pending';

  if (resumable) {
    return {
      kind: 'resume',
      body: {
        keyId: getRazorpayKeyId(),
        subscriptionId: sub.id,
        amount: Math.round(amountInr * 100),
        currency: 'INR',
        policyId: weekRow.id,
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
        resumed: true,
      },
    };
  }

  try {
    await razorpay.subscriptions.cancel(subId);
  } catch {
    /* already terminal */
  }

  await markPendingWeeklyPolicyAbandoned(admin, weekRow.id, user.id);
  await admin
    .from('profiles')
    .update({ razorpay_subscription_id: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .eq('razorpay_subscription_id', subId);
  return { kind: 'cleared' };
}
