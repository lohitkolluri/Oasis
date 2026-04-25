'use client';

import { setAppBadgeFromCount } from '@/lib/pwa/app-badge';
import { OASIS_BADGE_REFRESH_EVENT } from '@/lib/pwa/badge-refresh';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useMemo, useRef } from 'react';

interface RiderAppBadgeSyncProps {
  profileId: string;
}

async function countUnreadNotifications(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('rider_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}

/** Triggered claims that still need a GPS / declaration verification row. */
async function countClaimsPendingVerification(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
): Promise<number> {
  const { data: policies, error: polErr } = await supabase
    .from('weekly_policies')
    .select('id')
    .eq('profile_id', profileId);
  if (polErr || !policies?.length) return 0;
  const policyIds = policies.map((p) => p.id as string);

  const { data: claims, error: clErr } = await supabase
    .from('parametric_claims')
    .select('id')
    .in('policy_id', policyIds)
    .eq('status', 'triggered');
  if (clErr || !claims?.length) return 0;
  const claimIds = claims.map((c) => c.id as string);

  const { data: verified, error: vErr } = await supabase
    .from('claim_verifications')
    .select('claim_id')
    .in('claim_id', claimIds);
  if (vErr) return claimIds.length;
  const verifiedSet = new Set((verified ?? []).map((r) => r.claim_id as string));
  return claimIds.filter((id) => !verifiedSet.has(id)).length;
}

async function computeBadgeTotal(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
): Promise<number> {
  const [unread, pendingVerify] = await Promise.all([
    countUnreadNotifications(supabase, profileId),
    countClaimsPendingVerification(supabase, profileId),
  ]);
  return unread + pendingVerify;
}

/**
 * Keeps the installed PWA icon badge in sync with unread rider notifications
 * and claims that still need location verification.
 */
export function RiderAppBadgeSync({ profileId }: RiderAppBadgeSyncProps) {
  const supabase = useMemo(() => createClient(), []);
  const debounceRef = useRef<number | null>(null);

  const refreshBadge = useCallback(async () => {
    const total = await computeBadgeTotal(supabase, profileId);
    setAppBadgeFromCount(total);
  }, [supabase, profileId]);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void refreshBadge();
    }, 400);
  }, [refreshBadge]);

  useEffect(() => {
    void refreshBadge();
  }, [refreshBadge]);

  useEffect(() => {
    const onBg = () => scheduleRefresh();
    window.addEventListener('oasis:pwa-bg-sync', onBg);
    return () => window.removeEventListener('oasis:pwa-bg-sync', onBg);
  }, [scheduleRefresh]);

  useEffect(() => {
    const onManual = () => void refreshBadge();
    window.addEventListener(OASIS_BADGE_REFRESH_EVENT, onManual);
    return () => window.removeEventListener(OASIS_BADGE_REFRESH_EVENT, onManual);
  }, [refreshBadge]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshBadge();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshBadge]);

  useEffect(() => {
    const channel = supabase
      .channel(`oasis_badge_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rider_notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rider_notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'claim_verifications',
          filter: `profile_id=eq.${profileId}`,
        },
        () => scheduleRefresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, profileId, scheduleRefresh]);

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      setAppBadgeFromCount(0);
    };
  }, []);

  return null;
}
