'use client';

import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Cloud, CreditCard, FileCheck, Radio, ShieldAlert } from 'lucide-react';
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
  const [connected, setConnected] = useState(false);
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
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

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
    <div className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:border-[#3a3a3a] transition-all">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2d2d2d]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
            <Radio className="h-3.5 w-3.5 text-[#22c55e]" />
          </div>
          <div>
            <p className="text-sm font-semibold font-display text-white">Live Feed</p>
            <p className="text-[10px] text-[#666666]">Real-time platform events</p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            connected
              ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20'
              : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#f59e0b]'}`}
          />
          {connected ? 'Live' : 'Connecting'}
        </span>
      </div>

      <div className="max-h-[340px] overflow-y-auto scrollbar-thin">
        {events.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Radio className="h-5 w-5 text-[#3a3a3a] mx-auto mb-2" />
            <p className="text-xs text-[#666666]">Waiting for events…</p>
            <p className="text-[10px] text-[#3a3a3a] mt-1">
              New claims, payouts, and disruptions appear here in real time
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((ev) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="border-b border-[#2d2d2d] last:border-b-0"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 ${feedColors[ev.type]}`}
                  >
                    {feedIcons[ev.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{ev.title}</p>
                    <p className="text-[10px] text-[#666666] truncate">{ev.detail}</p>
                  </div>
                  <span className="text-[10px] text-[#3a3a3a] tabular-nums shrink-0">
                    {timeAgo(ev.timestamp)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
