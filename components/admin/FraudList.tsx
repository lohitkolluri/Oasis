'use client';

import { CopyableId } from '@/components/ui/CopyableId';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type PlanPackageRow = { payout_per_claim_inr: number | null };

interface WeeklyPolicyEmbed {
  profile_id?: string | null;
  plan_packages?: PlanPackageRow | PlanPackageRow[] | null;
}

interface Claim {
  id: string;
  policy_id?: string | null;
  payout_amount_inr: number;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  admin_review_status?: string | null;
  reviewed_by?: string | null;
  weekly_policies?: WeeklyPolicyEmbed | WeeklyPolicyEmbed[] | null;
}

function weeklyPolicyRow(wp: Claim['weekly_policies']): WeeklyPolicyEmbed | null {
  if (!wp) return null;
  return Array.isArray(wp) ? wp[0] ?? null : wp;
}

function payoutCapInr(wp: WeeklyPolicyEmbed | null): number | null {
  if (!wp?.plan_packages) return null;
  const pkg = Array.isArray(wp.plan_packages)
    ? wp.plan_packages[0]
    : wp.plan_packages;
  if (pkg?.payout_per_claim_inr == null) return null;
  return Number(pkg.payout_per_claim_inr);
}

function StatusBadge({ status }: { status: string }) {
  const label = (status || 'pending').toLowerCase();
  const styles =
    label === 'approved'
      ? 'border-[#22c55e]/35 bg-[#22c55e]/12 text-[#4ade80]'
      : label === 'rejected'
        ? 'border-[#ef4444]/35 bg-[#ef4444]/12 text-[#f87171]'
        : 'border-[#2d2d2d] bg-[#1e1e1e] text-[#9ca3af]';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
        styles,
      )}
    >
      {label}
    </span>
  );
}

function AmountCell({ claim }: { claim: Claim }) {
  const payout = Number(claim.payout_amount_inr);
  const wp = weeklyPolicyRow(claim.weekly_policies);
  const cap = payoutCapInr(wp);

  const displayAmount = payout > 0 ? payout : cap;

  if (displayAmount != null && displayAmount > 0) {
    return (
      <div className="font-semibold tabular-nums text-white">
        ₹{displayAmount.toLocaleString('en-IN')}
      </div>
    );
  }

  return (
    <div className="font-semibold tabular-nums text-[#666]">₹0</div>
  );
}

function ActionButtons({
  claimId,
  currentStatus,
  onReviewed,
}: {
  claimId: string;
  currentStatus?: string | null;
  onReviewed: (id: string, action: 'approved' | 'rejected') => void;
}) {
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null);

  const isApproved = currentStatus === 'approved';
  const isRejected = currentStatus === 'rejected';

  async function handleAction(action: 'approved' | 'rejected') {
    setLoading(action);
    try {
      const res = await fetch('/api/admin/review-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action }),
      });
      if (res.ok) onReviewed(claimId, action);
    } catch {
      // Ignore
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-label="Approve claim"
        title="Approve"
        onClick={() => handleAction('approved')}
        disabled={!!loading}
        className={cn(
          'size-8 shrink-0 rounded-full border transition-colors inline-flex items-center justify-center',
          isRejected
            ? 'border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]'
            : isApproved
              ? 'border-[#3f3f46] text-[#a1a1aa] bg-transparent hover:text-[#22c55e] hover:border-[#22c55e]/40 hover:bg-[#22c55e]/10'
              : 'border-[#2d2d2d] text-[#9ca3af] hover:bg-white/[0.04] hover:text-white',
        )}
      >
        {loading === 'approved' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
        ) : (
          <Check className="w-3.5 h-3.5" aria-hidden />
        )}
      </button>
      <button
        type="button"
        aria-label="Reject claim"
        title="Reject"
        onClick={() => handleAction('rejected')}
        disabled={!!loading}
        className={cn(
          'size-8 shrink-0 rounded-full border transition-colors inline-flex items-center justify-center',
          isApproved
            ? 'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]'
            : isRejected
              ? 'border-[#3f3f46] text-[#a1a1aa] bg-transparent hover:text-[#ef4444] hover:border-[#ef4444]/40 hover:bg-[#ef4444]/10'
              : 'border-[#2d2d2d] text-[#9ca3af] hover:bg-white/[0.04] hover:text-white',
        )}
      >
        {loading === 'rejected' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
        ) : (
          <X className="w-3.5 h-3.5" aria-hidden />
        )}
      </button>
    </div>
  );
}

type StatusFilter = 'all' | 'pending' | 'reviewed';

export function FraudList({ claims: initialClaims }: { claims: Claim[] }) {
  const [claims, setClaims] = useState(initialClaims);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [interactedIds, setInteractedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  function handleReviewed(id: string, action: 'approved' | 'rejected') {
    setInteractedIds((prev) => new Set(prev).add(id));
    setClaims((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, admin_review_status: action } : c,
      ),
    );
  }

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (filter === 'pending') {
        return !c.admin_review_status || interactedIds.has(c.id);
      }
      if (filter === 'reviewed') {
        return !!c.admin_review_status;
      }
      return true;
    });
  }, [claims, filter, interactedIds]);

  const totalCount = claims.length;
  const visibleCount = filteredClaims.length;

  const totalPages = Math.max(1, Math.ceil(visibleCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filteredClaims.slice(
    startIndex,
    startIndex + pageSize,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 px-5 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-white">Fraud queue</p>
          <p className="text-[11px] text-[#6b7280]">
            Showing{' '}
            <span className="font-semibold text-[#e5e7eb]">
              {visibleCount === 0
                ? 0
                : `${startIndex + 1}–${Math.min(
                    startIndex + pageSize,
                    visibleCount,
                  )}`}
            </span>{' '}
            of <span className="tabular-nums">{totalCount}</span> claims
          </p>
        </div>

        <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide">
          <div className="inline-flex rounded-full bg-[#101010] p-1 text-[11px] border border-[#2d2d2d] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            {(['all', 'pending', 'reviewed'] as StatusFilter[]).map((f) => (
              <Button
                key={f}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={cn(
                  'h-8 px-3 text-[11px] font-medium !rounded-full',
                  'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]',
                  filter === f &&
                    'bg-[#161616] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-[#161616]',
                )}
              >
                {f === 'all'
                  ? 'All statuses'
                  : f === 'pending'
                    ? 'Pending'
                    : 'Reviewed'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[#2d2d2d]">
        {visibleCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <p className="text-sm font-medium text-[#555]">
              No claims match the current filter
            </p>
            <p className="text-xs text-[#444] mt-1">
              Try a different status filter.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                  <TableHead className="w-[min(200px,22%)]">Status</TableHead>
                  <TableHead className="w-[110px] text-right">Amount</TableHead>
                  <TableHead className="w-[140px]">Rider</TableHead>
                  <TableHead className="w-[140px]">Policy</TableHead>
                  <TableHead className="min-w-[160px]">Reason</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                  <TableHead className="w-[120px] text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => {
                  const wp = weeklyPolicyRow(c.weekly_policies);
                  const profileId = wp?.profile_id ?? null;
                  return (
                    <TableRow key={c.id} className="border-[#2d2d2d]">
                      <TableCell>
                        <StatusBadge
                          status={c.admin_review_status || 'pending'}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <AmountCell claim={c} />
                      </TableCell>
                      <TableCell>
                        {profileId ? (
                          <CopyableId
                            value={profileId}
                            prefix=""
                            length={8}
                            label="Copy rider ID"
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {c.policy_id ? (
                          <CopyableId
                            value={c.policy_id}
                            prefix=""
                            length={8}
                            label="Copy policy ID"
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] text-[#9ca3af] leading-snug line-clamp-2">
                          {c.flag_reason || 'Manual review required'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ActionButtons
                          claimId={c.id}
                          currentStatus={c.admin_review_status}
                          onReviewed={handleReviewed}
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums">
                        {new Date(c.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-5 py-3 border-t border-[#2d2d2d] text-[11px] text-[#6b7280] bg-[#050505]">
              <div className="flex items-center gap-2">
                <span className="text-[#9ca3af]">Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-full border border-[#2d2d2d] bg-[#111111] px-3 text-[11px] outline-none text-[#e5e7eb] focus-visible:ring-2 focus-visible:ring-white/10"
                >
                  {[10, 25, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="tabular-nums text-[#9ca3af]">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Previous page"
                    title="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={cn(
                      'size-8 p-0 !rounded-full border border-white/20 bg-transparent text-white',
                      'hover:bg-white hover:text-black hover:border-white',
                      'disabled:!opacity-100 disabled:pointer-events-none disabled:text-white/80 disabled:border-white/20',
                      'disabled:hover:bg-transparent disabled:hover:text-white/80 disabled:hover:border-white/20',
                    )}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Next page"
                    title="Next page"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    className={cn(
                      'size-8 p-0 !rounded-full border border-white/20 bg-transparent text-white',
                      'hover:bg-white hover:text-black hover:border-white',
                      'disabled:!opacity-100 disabled:pointer-events-none disabled:text-white/80 disabled:border-white/20',
                      'disabled:hover:bg-transparent disabled:hover:text-white/80 disabled:hover:border-white/20',
                    )}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
