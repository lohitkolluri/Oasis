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
import { useMemo, useState } from 'react';

type PaymentRow = {
  id: string;
  status: string;
  amountInr: number;
  profileId: string;
  weeklyPolicyId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  paidAt: string | null;
  stripeStatus: string | null;
  amountMatch: boolean | null;
  statusMismatch: boolean;
  hasIssue: boolean;
};

type StatusFilter = 'all' | 'paid' | 'failed' | 'pending';
type StripeFilter = 'all' | 'linked' | 'unlinked' | 'issue';

interface PaymentTransactionsTableProps {
  rows: PaymentRow[];
  stripeIntentsAvailable: boolean;
}

export function PaymentTransactionsTable({
  rows,
  stripeIntentsAvailable,
}: PaymentTransactionsTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stripeFilter, setStripeFilter] = useState<StripeFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }

      const hasStripe = !!row.stripePaymentIntentId;
      if (stripeFilter === 'linked' && !hasStripe) return false;
      if (stripeFilter === 'unlinked' && hasStripe) return false;
      if (stripeFilter === 'issue' && !row.hasIssue) return false;

      return true;
    });
  }, [rows, statusFilter, stripeFilter]);

  const totalCount = rows.length;
  const visibleCount = filteredRows.length;

  const totalPages = Math.max(1, Math.ceil(visibleCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filteredRows.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 px-5 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-white">Recent payments</p>
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
            of{' '}
            <span className="tabular-nums">{totalCount}</span> payments
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide">
            <div className="inline-flex rounded-full bg-[#101010] p-1 text-[11px] border border-[#2d2d2d] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            {(['all', 'paid', 'failed', 'pending'] as StatusFilter[]).map(
              (value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  className={cn(
                    'h-8 px-3 text-[11px] font-medium !rounded-full',
                    'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]',
                    statusFilter === value &&
                      'bg-[#161616] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-[#161616]',
                  )}
                >
                  {value === 'all'
                    ? 'All statuses'
                    : value.charAt(0).toUpperCase() + value.slice(1)}
                </Button>
              ),
            )}
          </div>
          </div>

          <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide">
            <div className="inline-flex rounded-full bg-[#101010] p-1 text-[11px] border border-[#2d2d2d] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            {(['all', 'linked', 'unlinked', 'issue'] as StripeFilter[]).map(
              (value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStripeFilter(value);
                    setPage(1);
                  }}
                  className={cn(
                    'h-8 px-3 text-[11px] font-medium !rounded-full',
                    'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]',
                    stripeFilter === value &&
                      'bg-[#161616] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-[#161616]',
                  )}
                >
                  {value === 'all'
                    ? 'All Stripe'
                    : value === 'linked'
                      ? 'Stripe linked'
                      : value === 'unlinked'
                        ? 'No Stripe ID'
                        : 'With issues'}
                </Button>
              ),
            )}
          </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#2d2d2d]">
        {visibleCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <p className="text-sm font-medium text-[#555]">
              No payments match the current filters
            </p>
            <p className="text-xs text-[#444] mt-1">
              Try changing the status or Stripe filters.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                  <TableHead className="w-[min(200px,24%)]">Status</TableHead>
                  <TableHead className="w-[110px] text-right">
                    Amount
                  </TableHead>
                  <TableHead className="w-[140px]">Rider</TableHead>
                  <TableHead className="w-[140px]">Policy</TableHead>
                  {stripeIntentsAvailable && (
                    <TableHead className="w-[150px]">Stripe</TableHead>
                  )}
                  <TableHead className="w-[120px] text-right">Paid at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((row) => {
                  const hasStripe = !!row.stripePaymentIntentId;

                  return (
                    <TableRow key={row.id} className="border-[#2d2d2d]">
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-[#2d2d2d] bg-[#1e1e1e] px-2 py-0.5 text-[10px] font-medium text-[#9ca3af]">
                            {row.status}
                          </span>
                          {stripeIntentsAvailable && row.stripeStatus && (
                            <span className="inline-flex items-center rounded-full border border-[#7dd3fc]/20 bg-[#7dd3fc]/10 px-2 py-0.5 text-[10px] font-medium text-[#7dd3fc]">
                              {row.stripeStatus}
                            </span>
                          )}
                          {row.hasIssue && (
                            <span className="inline-flex items-center rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-2 py-0.5 text-[10px] font-medium text-[#f97316]">
                              {row.amountMatch === false
                                ? 'Amount mismatch'
                                : row.statusMismatch
                                  ? 'Status mismatch'
                                  : 'No Stripe match'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-white">
                        ₹{Number(row.amountInr).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <CopyableId
                          value={row.profileId}
                          prefix=""
                          length={8}
                          label="Copy rider ID"
                        />
                      </TableCell>
                      <TableCell>
                        {row.weeklyPolicyId ? (
                          <CopyableId
                            value={row.weeklyPolicyId}
                            prefix=""
                            length={8}
                            label="Copy policy ID"
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      {stripeIntentsAvailable && (
                        <TableCell>
                          {row.stripePaymentIntentId ? (
                            <CopyableId
                              value={row.stripePaymentIntentId}
                              prefix=""
                              length={12}
                              label="Copy Stripe payment intent ID"
                            />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums">
                        {row.paidAt
                          ? new Date(row.paidAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : new Date(row.createdAt).toLocaleString('en-IN', {
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
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={cn(
                      'h-8 px-4 text-[11px] !rounded-full border border-white/20 bg-transparent text-white',
                      'hover:bg-white hover:text-black hover:border-white',
                      'disabled:opacity-100 disabled:text-white/50 disabled:border-white/10 disabled:hover:bg-transparent disabled:hover:text-white/50 disabled:hover:border-white/10',
                    )}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={cn(
                      'h-8 px-4 text-[11px] !rounded-full border border-white/20 bg-transparent text-white',
                      'hover:bg-white hover:text-black hover:border-white',
                      'disabled:opacity-100 disabled:text-white/50 disabled:border-white/10 disabled:hover:bg-transparent disabled:hover:text-white/50 disabled:hover:border-white/10',
                    )}
                  >
                    Next
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

