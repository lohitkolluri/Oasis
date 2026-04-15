'use client';

import { useRealtime } from '@/components/rider/RealtimeProvider';
import { Card } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PARAMETRIC_RULE_VERSION } from '@/lib/config/constants';
import { formatPolicyDateShort } from '@/lib/datetime/oasis-time';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Car, ChevronDown, ChevronUp, Cloud, MapPin, Megaphone } from 'lucide-react';
import * as React from 'react';

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

export type PayoutLedgerInfo = {
  id: string;
  mock_upi_ref: string | null;
  completed_at: string | null;
  amount_inr: number | null;
};

const typeLabels: Record<string, string> = {
  weather: 'Weather',
  traffic: 'Traffic',
  social: 'Social',
};

const eventTypeIconBg: Record<string, string> = {
  weather: 'bg-sky-500/15 text-sky-400',
  traffic: 'bg-amber-500/15 text-amber-400',
  social: 'bg-red-500/15 text-red-400',
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
  ledgerByClaimId?: Record<string, PayoutLedgerInfo>;
}

function shortId(id: string | null | undefined, len = 8) {
  if (!id) return '—';
  return id.length <= len ? id : `${id.slice(0, len)}…`;
}

export function RealtimeClaimsList({
  claims,
  policyMap,
  ledgerByClaimId = {},
}: RealtimeClaimsListProps) {
  const { claimStatusUpdates } = useRealtime();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

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
    const isUnderReview = claim.is_flagged;
    const isPaid = !isUnderReview && status === 'paid';
    const isPending = !isUnderReview && status !== 'paid';

    const label = isUnderReview ? 'Under review' : isPaid ? 'Paid' : 'Pending verification';

    return (
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center rounded-full font-bold px-2 py-0.5 text-[10px] uppercase tracking-wide leading-tight outline outline-1 outline-offset-1 transition-all',
            isUnderReview && 'bg-[#ffc043]/15 text-[#ffc043] outline-[#ffc043]/40',
            isPaid && 'bg-[#3AA76D]/15 text-[#3AA76D] outline-[#3AA76D]/40',
            isPending && 'bg-amber-400/15 text-amber-400 outline-amber-400/40',
          )}
        >
          {label}
        </span>
        {justPaid && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#3AA76D]/20 text-[#3AA76D] outline outline-1 outline-[#3AA76D]/50 px-2 py-0.5 animate-pulse text-[10px] font-bold uppercase tracking-wide leading-tight">
            Just paid
          </span>
        )}
      </span>
    );
  }

  return (
    <Card
      variant="default"
      padding="none"
      className="rounded-2xl border-white/10 bg-[#0c0c0c] overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-white/10">
        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.12em]">
          {claims.length} {claims.length === 1 ? 'claim' : 'claims'}
        </p>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-zinc-500 font-medium">Date & time</TableHead>
              <TableHead className="text-zinc-500 font-medium">Event</TableHead>
              <TableHead className="text-zinc-500 font-medium text-right">Amount</TableHead>
              <TableHead className="text-zinc-500 font-medium whitespace-nowrap">Status</TableHead>
              <TableHead className="text-zinc-500 font-medium">Policy</TableHead>
              <TableHead className="text-zinc-500 font-medium w-[100px] text-right">
                Why paid?
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-white/10">
            <AnimatePresence initial={false}>
              {claims.map((claim) => {
                const status = resolveStatus(claim);
                const rawEvent = claim.live_disruption_events;
                const event: DisruptionEvent | null = Array.isArray(rawEvent)
                  ? (rawEvent[0] ?? null)
                  : rawEvent;
                const policy = policyMap[claim.policy_id];
                const justPaid = status === 'paid' && claim.status !== 'paid';
                const eventLabel = event?.event_type
                  ? `${typeLabels[event.event_type] ?? event.event_type}${event.severity_score != null ? ` · ${event.severity_score}/10` : ''}`
                  : '—';
                const policyLabel = policy
                  ? `${policy.planName} · ${formatPolicyDateShort(policy.weekStart)}`
                  : '—';
                const iconBg = event?.event_type
                  ? (eventTypeIconBg[event.event_type] ?? 'bg-white/10 text-zinc-400')
                  : 'bg-white/10 text-zinc-400';

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
                      className="border-b border-white/10 transition-colors hover:bg-white/[0.04]"
                    >
                      <TableCell className="tabular-nums text-zinc-300 text-[13px] py-3.5 whitespace-nowrap">
                        {new Date(claim.created_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="py-3.5 min-w-[140px]">
                        <span className="flex items-center gap-2.5 text-[13px] font-medium text-zinc-200">
                          {event?.event_type ? (
                            <div
                              className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${iconBg}`}
                            >
                              <EventTypeIcon type={event.event_type} />
                            </div>
                          ) : null}
                          <span className="truncate max-w-[180px]">{eventLabel}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <span
                          className={cn(
                            'font-bold tabular-nums text-[13px]',
                            status === 'paid' ? 'text-[#3AA76D]' : 'text-zinc-400',
                          )}
                        >
                          {status === 'paid' ? '+' : ''}₹
                          {Number(claim.payout_amount_inr).toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <StatusBadge claim={claim} status={status} justPaid={justPaid} />
                      </TableCell>
                      <TableCell className="text-[12px] truncate max-w-[140px] font-medium text-zinc-500 py-3.5 whitespace-nowrap">
                        {policyLabel}
                      </TableCell>
                      <TableCell className="text-right py-3.5 align-middle">
                        {status === 'paid' && !claim.is_flagged ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId((id) => (id === claim.id ? null : claim.id))
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400/90 hover:text-sky-300"
                          >
                            {expandedId === claim.id ? (
                              <>
                                Hide <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                Explain <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">—</span>
                        )}
                      </TableCell>
                    </motion.tr>
                    {expandedId === claim.id && status === 'paid' && !claim.is_flagged && (
                      <TableRow className="border-white/10 bg-white/[0.03] hover:bg-white/[0.03]">
                        <TableCell colSpan={6} className="py-3 px-4 text-left align-top">
                          <div className="max-w-xl space-y-2 text-[12px] leading-relaxed text-zinc-400">
                            <p className="font-semibold text-zinc-200">Why this payout</p>
                            <p>
                              Oasis covers <strong className="text-zinc-300">loss of income</strong>{' '}
                              when a verified disruption in your zone meets the parametric rules
                              (weather, air quality, traffic, or zone restrictions). This is not
                              health, accident, or vehicle insurance.
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-500">
                              <li>
                                Active rule version:{' '}
                                <span className="tabular-nums text-zinc-400">
                                  {PARAMETRIC_RULE_VERSION}
                                </span>
                              </li>
                              <li>
                                Disruption event:{' '}
                                <span className="font-mono text-[10px] text-zinc-400">
                                  {shortId(claim.disruption_event_id)}
                                </span>
                              </li>
                              {ledgerByClaimId[claim.id] && (
                                <>
                                  <li>
                                    Ledger entry:{' '}
                                    <span className="font-mono text-[10px] text-zinc-400">
                                      {shortId(ledgerByClaimId[claim.id].id, 12)}
                                    </span>
                                  </li>
                                  {ledgerByClaimId[claim.id].mock_upi_ref && (
                                    <li>
                                      Reference:{' '}
                                      <span className="font-mono text-[10px] text-zinc-400 break-all">
                                        {ledgerByClaimId[claim.id].mock_upi_ref}
                                      </span>
                                    </li>
                                  )}
                                  {ledgerByClaimId[claim.id].completed_at && (
                                    <li>
                                      Credited:{' '}
                                      {new Date(
                                        ledgerByClaimId[claim.id].completed_at!,
                                      ).toLocaleString('en-IN', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </li>
                                  )}
                                </>
                              )}
                            </ul>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {claim.is_flagged && claim.flag_reason && (
                      <TableRow className="border-white/10 bg-[#ffc043]/5 hover:bg-[#ffc043]/8">
                        <TableCell
                          colSpan={6}
                          className="text-[11px] text-[#ffc043] py-2.5 px-4 font-medium"
                        >
                          Under review: {claim.flag_reason}. Re-verify your location from the
                          dashboard or contact support for payout.
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
