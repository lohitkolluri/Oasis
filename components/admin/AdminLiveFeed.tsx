'use client';

import { createClient } from '@/lib/supabase/client';
import { Activity, Cloud, CreditCard, FileCheck, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface FeedEvent {
  id: string;
  type: 'claim_created' | 'claim_paid' | 'disruption' | 'policy_activated' | 'claim_flagged';
  title: string;
  detail: string;
  timestamp: Date;
}

const MAX_FEED = 20;

const feedIcons: Record<FeedEvent['type'], React.ReactNode> = {
  claim_created: <FileCheck className="h-3.5 w-3.5" />,
  claim_paid: <CreditCard className="h-3.5 w-3.5" />,
  disruption: <Cloud className="h-3.5 w-3.5" />,
  policy_activated: <Activity className="h-3.5 w-3.5" />,
  claim_flagged: <ShieldAlert className="h-3.5 w-3.5" />,
};

const feedColors: Record<FeedEvent['type'], string> = {
  claim_created: 'bg-[#7dd3fc]/10 text-[#7dd3fc] border-[#7dd3fc]/20',
  claim_paid: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20',
  disruption: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
  policy_activated: 'bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20',
  claim_flagged: 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20',
};

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function AdminLiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const counterRef = useRef(0);

  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('admin_live_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parametric_claims' },
        (payload) => {
          const row = payload.new as {
            id: string;
            payout_amount_inr: number;
            status?: string;
            is_flagged?: boolean;
          };
          const type: FeedEvent['type'] = row.is_flagged
            ? 'claim_flagged'
            : row.status === 'paid'
              ? 'claim_paid'
              : 'claim_created';
          const title =
            type === 'claim_flagged'
              ? 'Claim flagged'
              : type === 'claim_paid'
                ? 'Claim paid'
                : 'Claim created';
          pushEvent({
            type,
            title,
            detail: `₹${Number(row.payout_amount_inr).toLocaleString('en-IN')}`,
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parametric_claims' },
        (payload) => {
          const old = payload.old as { status?: string } | null;
          const row = payload.new as {
            id: string;
            payout_amount_inr: number;
            status?: string;
            is_flagged?: boolean;
          };
          if (old?.status !== 'paid' && row.status === 'paid') {
            pushEvent({
              type: 'claim_paid',
              title: 'Claim paid',
              detail: `₹${Number(row.payout_amount_inr).toLocaleString('en-IN')} credited to rider wallet`,
            });
          }
          if (row.is_flagged && !old?.status) {
            pushEvent({
              type: 'claim_flagged',
              title: 'Claim flagged for review',
              detail: `₹${Number(row.payout_amount_inr).toLocaleString('en-IN')}`,
            });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_disruption_events' },
        (payload) => {
          const row = payload.new as {
            event_type?: string;
            severity_score?: number;
          };
          pushEvent({
            type: 'disruption',
            title: `${(row.event_type ?? 'unknown').charAt(0).toUpperCase() + (row.event_type ?? 'unknown').slice(1)} disruption`,
            detail: `Severity ${row.severity_score ?? '?'}/10`,
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'weekly_policies',
        },
        (payload) => {
          const old = payload.old as { is_active?: boolean } | null;
          const row = payload.new as { id: string; is_active?: boolean };
          if (!old?.is_active && row.is_active) {
            pushEvent({
              type: 'policy_activated',
              title: 'Policy activated',
              detail: `New weekly policy live`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  function pushEvent(partial: Omit<FeedEvent, 'id' | 'timestamp'>) {
    counterRef.current += 1;
    const ev: FeedEvent = {
      ...partial,
      id: `${Date.now()}-${counterRef.current}`,
      timestamp: new Date(),
    };
    setEvents((prev) => [ev, ...prev].slice(0, MAX_FEED));
  }

  return (
    <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#2d2d2d]">
        <p className="text-sm font-semibold text-white">Activity Feed</p>
        <span className="text-[10px] text-[#555]">Real-time events via Supabase</span>
      </div>

      <div className="max-h-[280px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-xs text-[#555]">Waiting for events...</p>
            <p className="text-[10px] text-[#444] mt-1">
              Claims, payouts, and disruptions appear here in real time
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2d2d2d]">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-2.5">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 ${feedColors[ev.type]}`}
                >
                  {feedIcons[ev.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{ev.title}</p>
                  <p className="text-[10px] text-[#555] truncate">{ev.detail}</p>
                </div>
                <span className="text-[10px] text-[#444] tabular-nums shrink-0">
                  {timeAgo(ev.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
