/**
 * Server-side Web Push (VAPID) for rider PWA. Complements Supabase Realtime toasts when the app is backgrounded.
 */

import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject } from '@/lib/config/env';

export type RiderNotificationPushInput = {
  profile_id: string;
  title: string;
  body: string;
  type: string;
  metadata?: Record<string, unknown>;
};

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function pushPriority(type: string): number {
  if (type === 'payout') return 3;
  if (type === 'disruption') return 2;
  return 1;
}

/**
 * One notification per profile per batch (avoid spamming payout + disruption in one tick).
 * Skips `reminder` rows — those are inserted early but meant as follow-ups once scheduling exists.
 */
export function pickWebPushRows(rows: RiderNotificationPushInput[]): RiderNotificationPushInput[] {
  const byProfile = new Map<string, RiderNotificationPushInput>();
  for (const row of rows) {
    if (row.type === 'reminder') continue;
    const cur = byProfile.get(row.profile_id);
    if (!cur || pushPriority(row.type) > pushPriority(cur.type)) {
      byProfile.set(row.profile_id, row);
    }
  }
  return [...byProfile.values()];
}

function openPathForNotification(row: RiderNotificationPushInput): string {
  const claimId = row.metadata?.claim_id;
  if (typeof claimId === 'string' && claimId.length > 0) {
    return '/dashboard/claims';
  }
  return '/dashboard';
}

export async function dispatchWebPushForRiderNotifications(
  admin: SupabaseClient,
  rows: RiderNotificationPushInput[],
): Promise<void> {
  if (rows.length === 0 || !ensureVapid()) return;

  const toSend = pickWebPushRows(rows);
  if (toSend.length === 0) return;

  for (const row of toSend) {
    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('profile_id', row.profile_id);

    if (error || !subs?.length) continue;

    const openPath = openPathForNotification(row);
    const payload = JSON.stringify({
      title: row.title,
      body: row.body,
      url: openPath,
      tag: `oasis-${row.type}-${row.profile_id.slice(0, 8)}`,
    });

    for (const sub of subs) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(subscription, payload, {
          TTL: 60 * 60 * 12,
          urgency: row.type === 'payout' ? 'high' : 'normal',
        });
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
  }
}
