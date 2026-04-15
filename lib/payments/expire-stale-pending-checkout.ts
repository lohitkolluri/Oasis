/**
 * Abandoned checkouts: pending weekly_policy rows older than PAYMENTS.PENDING_CHECKOUT_TTL_MS
 * become `failed` so the unique (profile, week) row can be reused / retried.
 */
import { getRazorpayInstance } from '@/lib/clients/razorpay';
import { PAYMENTS } from '@/lib/config/constants';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function expireStalePendingWeeklyPolicies(
  admin: SupabaseClient,
  profileId: string,
  weekStart: string,
): Promise<void> {
  const cutoff = new Date(Date.now() - PAYMENTS.PENDING_CHECKOUT_TTL_MS).toISOString();

  const { data: staleRows } = await admin
    .from('weekly_policies')
    .select('id, razorpay_subscription_id')
    .eq('profile_id', profileId)
    .eq('week_start_date', weekStart)
    .eq('payment_status', 'pending')
    .lt('created_at', cutoff);

  if (!staleRows?.length) return;

  let razorpay: ReturnType<typeof getRazorpayInstance> | null = null;
  const getRzp = () => {
    if (!razorpay) razorpay = getRazorpayInstance();
    return razorpay;
  };

  for (const row of staleRows) {
    if (row.razorpay_subscription_id) {
      try {
        await getRzp().subscriptions.cancel(row.razorpay_subscription_id);
      } catch {
        /* already cancelled or invalid */
      }
    }

    await admin
      .from('weekly_policies')
      .update({
        payment_status: 'failed',
        razorpay_order_id: null,
        razorpay_payment_id: null,
        razorpay_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('payment_status', 'pending');

    await admin
      .from('payment_transactions')
      .update({ status: 'failed' })
      .eq('weekly_policy_id', row.id)
      .eq('status', 'pending');
  }
}
