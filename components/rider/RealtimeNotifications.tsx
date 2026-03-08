'use client';

import { gooeyToast } from 'goey-toast';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

interface RealtimeNotificationsProps {
  profileId: string;
}

/**
 * Subscribes to rider_notifications for this profile. When a new notification
 * is inserted (e.g. after autonomous claim/payout), shows a toast. No user action required.
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
          const row = payload.new as { title?: string; body?: string; type?: string };
          gooeyToast.success(row.title ?? 'Notification', {
            description: row.body ?? undefined,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, profileId]);

  return null;
}
