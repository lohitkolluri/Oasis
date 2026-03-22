/**
 * POST /api/admin/rotate-logs
 *
 * Manually trigger log rotation. Calls the DB-level rotate_logs() function
 * which cleans up system_logs, read notifications, expired rate limits,
 * and old payment idempotency records (legacy Stripe + Razorpay).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { LOG_ROTATION } from '@/lib/config/constants';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async () => {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('rotate_logs', {
    p_system_logs_days: LOG_ROTATION.SYSTEM_LOGS_DAYS,
    p_read_notifications_days: LOG_ROTATION.READ_NOTIFICATIONS_DAYS,
    p_unread_notifications_days: LOG_ROTATION.UNREAD_NOTIFICATIONS_DAYS,
    p_razorpay_payment_events_days: LOG_ROTATION.RAZORPAY_PAYMENT_EVENTS_DAYS,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Log rotation failed', detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: 'Log rotation completed',
    retention: {
      system_logs: `${LOG_ROTATION.SYSTEM_LOGS_DAYS} days`,
      read_notifications: `${LOG_ROTATION.READ_NOTIFICATIONS_DAYS} days`,
      unread_notifications: `${LOG_ROTATION.UNREAD_NOTIFICATIONS_DAYS} days`,
      razorpay_payment_events: `${LOG_ROTATION.RAZORPAY_PAYMENT_EVENTS_DAYS} days`,
    },
    deleted_counts: data,
  });
});
