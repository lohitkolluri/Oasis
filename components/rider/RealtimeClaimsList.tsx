'use client';

import * as React from 'react';
import { useRealtime } from '@/components/rider/RealtimeProvider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { cn } from '@/lib/utils';

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

  function StatusBadge({
    claim,
    status,
    justPaid,
  }: {
    claim: ClaimRow;
    status: string;
    justPaid: boolean;
  }) {
    const label = claim.is_flagged
      ? 'Under review'
      : status === 'paid'
        ? 'Paid'
        : 'Pending verification';
    return (
      <span className="flex items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn(
            'border font-medium',
            claim.is_flagged &&
              'bg-[#ffc043]/15 text-[#ffc043] border-[#ffc043]/30',
            !claim.is_flagged &&
              status === 'paid' &&
              'bg-[#3AA76D]/15 text-[#3AA76D] border-[#3AA76D]/30',
            !claim.is_flagged &&
              status !== 'paid' &&
              'bg-amber-400/15 text-amber-400 border-amber-400/30'
          )}
        >
          {label}
        </Badge>
        {justPaid && (
          <Badge
            variant="outline"
            className="bg-[#3AA76D]/15 text-[#3AA76D] border-[#3AA76D]/30 animate-pulse text-[10px]"
          >
            Just paid
          </Badge>
        )}
      </span>
    );
  }

  return (
    <Card
      variant="default"
      padding="none"
      className="rounded-2xl border-white/10 bg-surface-1 overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-white/10">
        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.12em]">
          {claims.length} {claims.length === 1 ? 'claim' : 'claims'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-zinc-500 font-medium">Date & time</TableHead>
              <TableHead className="text-zinc-500 font-medium">Event</TableHead>
              <TableHead className="text-zinc-500 font-medium text-right">Amount</TableHead>
              <TableHead className="text-zinc-500 font-medium">Status</TableHead>
              <TableHead className="text-zinc-500 font-medium">Policy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-white/10">
            <AnimatePresence initial={false}>
              {claims.map((claim) => {
                const status = resolveStatus(claim);
                const rawEvent = claim.live_disruption_events;
                const event: DisruptionEvent | null = Array.isArray(rawEvent)
                  ? rawEvent[0] ?? null
                  : rawEvent;
                const policy = policyMap[claim.policy_id];
                const justPaid = status === 'paid' && claim.status !== 'paid';
                const eventLabel = event?.event_type
                  ? `${typeLabels[event.event_type] ?? event.event_type}${event.severity_score != null ? ` · ${event.severity_score}/10` : ''}`
                  : '—';
                const policyLabel = policy
                  ? `${policy.planName} · ${new Date(policy.weekStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
                  : '—';

                return (
                  <React.Fragment key={claim.id}>
                    <motion.tr
                      layout
                      initial={false}
                      animate={
                        justPaid
                          ? { backgroundColor: ['rgba(58,167,109,0.08)', 'transparent'] }
                          : {}
                      }
                      transition={{ duration: 1.5 }}
                      className="border-b border-white/10 transition-colors hover:bg-white/[0.03]"
                    >
                      <TableCell className="tabular-nums text-zinc-300 text-[13px] py-3">
                        {new Date(claim.created_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="flex items-center gap-2 text-[13px] text-zinc-300">
                          {event?.event_type ? (
                            <EventTypeIcon type={event.event_type} />
                          ) : null}
                          {eventLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <span
                          className={cn(
                            'font-semibold tabular-nums text-[13px]',
                            status === 'paid' ? 'text-[#3AA76D]' : 'text-zinc-400'
                          )}
                        >
                          {status === 'paid' ? '+' : ''}₹
                          {Number(claim.payout_amount_inr).toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge
                          claim={claim}
                          status={status}
                          justPaid={justPaid}
                        />
                      </TableCell>
                      <TableCell className="text-[13px] text-zinc-500 py-3">
                        {policyLabel}
                      </TableCell>
                    </motion.tr>
                    {claim.is_flagged && claim.flag_reason && (
                      <TableRow
                        className="border-white/10 bg-[#ffc043]/5 hover:bg-[#ffc043]/8"
                      >
                        <TableCell
                          colSpan={5}
                          className="text-[11px] text-[#ffc043] py-2"
                        >
                          Under review: {claim.flag_reason}. Re-verify your
                          location from the dashboard or contact support for
                          payout.
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
