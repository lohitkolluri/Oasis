'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ClaimEvent {
  id: string;
  policy_id: string;
  payout_amount_inr: number;
  status: string;
  is_flagged?: boolean;
  created_at: string;
}

interface RealtimeState {
  lastClaimEvent: ClaimEvent | null;
  lastPolicyChange: { id: string; is_active: boolean } | null;
  claimStatusUpdates: Map<string, string>;
}

interface RealtimeContextValue extends RealtimeState {
  subscribeToClaimStatus: (claimId: string) => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  lastClaimEvent: null,
  lastPolicyChange: null,
  claimStatusUpdates: new Map(),
  subscribeToClaimStatus: () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

interface RealtimeProviderProps {
  profileId: string;
  policyIds: string[];
  children: ReactNode;
}

/**
 * Single Realtime channel for all rider dashboard subscriptions.
 * Consolidates what was previously 3 separate subscriptions
 * (RealtimeWallet, WalletBalanceCard, claims page) into one shared channel.
 */
export function RealtimeProvider({ profileId, policyIds, children }: RealtimeProviderProps) {
  const router = useRouter();
  const refreshTimerRef = useRef<number | null>(null);
  const [state, setState] = useState<RealtimeState>({
    lastClaimEvent: null,
    lastPolicyChange: null,
    claimStatusUpdates: new Map(),
  });

  const supabase = useMemo(() => createClient(), []);
  const policyIdsKey = useMemo(() => [...policyIds].sort().join(','), [policyIds]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current != null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 350);
  }, [router]);

  const subscribeToClaimStatus = useCallback((claimId: string) => {
    setState((prev) => {
      const next = new Map(prev.claimStatusUpdates);
      if (!next.has(claimId)) next.set(claimId, 'pending_verification');
      return { ...prev, claimStatusUpdates: next };
    });
  }, []);

  useEffect(() => {
    const activePolicyIds = policyIdsKey ? policyIdsKey.split(',') : [];
    let channel = supabase
      .channel(`rider_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weekly_policies',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const policy = payload.new as { id: string; is_active: boolean };
          setState((prev) => ({ ...prev, lastPolicyChange: policy }));
          scheduleRefresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'weekly_policies',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const policy = payload.new as { id: string; is_active: boolean };
          setState((prev) => ({ ...prev, lastPolicyChange: policy }));
          scheduleRefresh();
        },
      );

    for (const policyId of activePolicyIds) {
      channel = channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'parametric_claims',
            filter: `policy_id=eq.${policyId}`,
          },
          (payload) => {
            const claim = payload.new as ClaimEvent;
            setState((prev) => ({ ...prev, lastClaimEvent: claim }));
            scheduleRefresh();
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'parametric_claims',
            filter: `policy_id=eq.${policyId}`,
          },
          (payload) => {
            const claim = payload.new as ClaimEvent;
            setState((prev) => {
              const next = new Map(prev.claimStatusUpdates);
              next.set(claim.id, claim.status);
              return { ...prev, lastClaimEvent: claim, claimStatusUpdates: next };
            });
            scheduleRefresh();
          },
        );
    }

    channel.subscribe();

    return () => {
      if (refreshTimerRef.current != null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [supabase, profileId, policyIdsKey, scheduleRefresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [router]);

  const value = useMemo(
    () => ({ ...state, subscribeToClaimStatus }),
    [state, subscribeToClaimStatus],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
