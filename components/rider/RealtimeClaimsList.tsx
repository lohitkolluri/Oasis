'use client';

import { useRealtime } from '@/components/rider/RealtimeProvider';
import {
  AlertCircle,
  Car,
  CheckCircle,
  Clock,
  Cloud,
  MapPin,
  Megaphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type DisruptionEvent = {
  event_type?: string;
  severity_score?: number;
  created_at?: string;
};

interface ClaimRow {
  id: string;
  payout_amount_inr: number;
  status: string;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  policy_id: string;
  disruption_event_id: string | null;
  live_disruption_events: DisruptionEvent | DisruptionEvent[] | null;
}

interface PolicyInfo {
  weekStart: string;
  weekEnd: string;
  planName: string;
}

const typeLabels: Record<string, string> = {
  weather: 'Weather',
  traffic: 'Traffic',
  social: 'Social',
};

function EventTypeIcon({ type }: { type: string }) {
  const cls = { width: 14, height: 14 };
  if (type === 'weather') return <Cloud style={cls} />;
  if (type === 'traffic') return <Car style={cls} />;
  if (type === 'social') return <Megaphone style={cls} />;
  return <MapPin style={cls} />;
}

interface RealtimeClaimsListProps {
  claims: ClaimRow[];
  policyMap: Record<string, PolicyInfo>;
}

export function RealtimeClaimsList({ claims, policyMap }: RealtimeClaimsListProps) {
  const { claimStatusUpdates } = useRealtime();

  const resolveStatus = (claim: ClaimRow) => {
    const realtimeStatus = claimStatusUpdates.get(claim.id);
    return realtimeStatus ?? claim.status;
  };

  return (
    <div className="rounded-2xl bg-surface-1 border border-white/10 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/10">
        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.12em]">
          {claims.length} {claims.length === 1 ? 'claim' : 'claims'}
        </p>
      </div>

      <div className="divide-y divide-white/10">
        <AnimatePresence initial={false}>
          {claims.map((claim) => {
            const status = resolveStatus(claim);
            const rawEvent = claim.live_disruption_events;
            const event: DisruptionEvent | null = Array.isArray(rawEvent)
              ? rawEvent[0] ?? null
              : rawEvent;
            const policy = policyMap[claim.policy_id];
            const justPaid = status === 'paid' && claim.status !== 'paid';

            return (
              <motion.div
                key={claim.id}
                layout
                initial={false}
                animate={justPaid ? { backgroundColor: ['rgba(58,167,109,0.08)', 'transparent'] } : {}}
                transition={{ duration: 1.5 }}
                className="px-4 py-3.5 flex items-start gap-3 active:bg-white/[0.03] transition-colors"
              >
                <div className="shrink-0 mt-0.5">
                  {claim.is_flagged ? (
                    <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-uber-yellow/12">
                      <AlertCircle className="text-uber-yellow" style={{ width: 16, height: 16 }} />
                    </div>
                  ) : status === 'paid' ? (
                    <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-uber-green/12">
                      <CheckCircle className="text-uber-green" style={{ width: 16, height: 16 }} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-[#1a2030]">
                      <Clock className="text-[#7b88a8]" style={{ width: 16, height: 16 }} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p
                      className={`text-[15px] font-bold tabular-nums ${
                        status === 'paid' ? 'text-white' : 'text-zinc-400'
                      }`}
                    >
                      {status === 'paid' ? '+' : ''}₹
                      {Number(claim.payout_amount_inr).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-[#404860] shrink-0 tabular-nums">
                      {new Date(claim.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {event?.event_type && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-zinc-500">
                        <EventTypeIcon type={event.event_type} />
                      </span>
                      <span className="text-[12px] text-zinc-400">
                        {typeLabels[event.event_type] ?? event.event_type}
                        {event.severity_score != null && (
                          <span className="text-[#404860]"> · {event.severity_score}/10</span>
                        )}
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] mb-1">
                    <span
                      className={
                        claim.is_flagged
                          ? 'text-uber-yellow font-medium'
                          : status === 'paid'
                            ? 'text-uber-green font-medium'
                            : 'text-amber-400 font-medium'
                      }
                    >
                      {claim.is_flagged
                        ? 'Under review'
                        : status === 'paid'
                          ? 'Paid'
                          : 'Pending verification'}
                      {justPaid && (
                        <span className="ml-1.5 text-[10px] bg-uber-green/15 text-uber-green px-1.5 py-0.5 rounded-full animate-pulse">
                          Just paid
                        </span>
                      )}
                    </span>
                  </p>

                  {policy && (
                    <p className="text-[10px] text-[#404860]">
                      {policy.planName} ·{' '}
                      {new Date(policy.weekStart).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}

                  {claim.is_flagged && claim.flag_reason && (
                    <div className="mt-2 rounded-[10px] bg-uber-yellow/8 border border-uber-yellow/15 px-3 py-2 space-y-1">
                      <p className="text-[11px] text-uber-yellow font-medium">
                        Under review: {claim.flag_reason}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        Re-verify your location from the dashboard or contact support for payout.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
