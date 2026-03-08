'use client';

import { gooeyToast } from 'goey-toast';
import { createClient } from '@/lib/supabase/client';
import { isMobileForGps } from '@/lib/utils/device';
import { useEffect } from 'react';

interface RealtimeNotificationsProps {
  profileId: string;
}

type NotificationRow = {
  title?: string;
  body?: string;
  type?: string;
  metadata?: { claim_id?: string; amount_inr?: number };
};

const LOCATION_TIMEOUT_MS = 15000;
const LOCATION_MAX_AGE_MS = 60000;

/**
 * Attempts to get current GPS and POST to verify-location so payout can be processed
 * automatically for riders in the event zone. Only runs on mobile (where GPS is reliable).
 * If the rider doesn't have the app open or denies location, they can still verify manually.
 */
async function tryAutoVerifyLocation(claimId: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return false;
  if (!isMobileForGps(navigator.userAgent)) return false;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const formData = new FormData();
        formData.set('claim_id', claimId);
        formData.set('lat', String(lat));
        formData.set('lng', String(lng));
        formData.set('declaration', 'true');
        try {
          const res = await fetch('/api/claims/verify-location', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json().catch(() => ({}));
          const payoutInitiated = data.payout_initiated === true;
          resolve(payoutInitiated);
        } catch {
          resolve(false);
        }
      },
      () => resolve(false),
      {
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT_MS,
        maximumAge: LOCATION_MAX_AGE_MS,
      },
    );
  });
}

/**
 * Subscribes to rider_notifications for this profile. When a new notification
 * is inserted (e.g. claim created for their zone), shows a toast and, on mobile,
 * automatically fetches current location and submits it so payout can be processed
 * without the rider tapping "Verify". Riders who don't have the app open still
 * see the manual verify prompt when they next open the app.
 */
export function RealtimeNotifications({ profileId }: RealtimeNotificationsProps) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('rider_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rider_notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          const title = row.title ?? 'Notification';
          const body = row.body;

          gooeyToast.success(title, { description: body });

          // Auto-verify: only for payout notifications with a claim_id (claim created for this rider's zone)
          const claimId = row.metadata?.claim_id;
          if (row.type === 'payout' && claimId && typeof claimId === 'string') {
            tryAutoVerifyLocation(claimId).then((payoutInitiated) => {
              if (payoutInitiated) {
                gooeyToast.success('Payout credited', {
                  description: 'Your location was verified. Amount added to your wallet.',
                });
              }
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, profileId]);

  return null;
}
