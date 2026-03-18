'use client';

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

export type PlanTierKey = string;

export type PlanPricingTimelineRow = {
  weekStartDate: string; // YYYY-MM-DD
  tiers: Record<
    PlanTierKey,
    {
      label: string;
      weeklyPremiumInr: number | null;
      subscriberCount: number;
    }
  >;
};

type RangeFilter = 8 | 12 | 24;

function formatWeek(d: string) {
  const dt = new Date(d);
  const end = new Date(dt);
  end.setDate(dt.getDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(dt)}–${fmt(end)}`;
}

interface PlanPricingTimelineTableProps {
  rows: PlanPricingTimelineRow[];
  tierOrder: Array<{ key: PlanTierKey; label: string }>;
}

export function PlanPricingTimelineTable({
  rows,
  tierOrder,
}: PlanPricingTimelineTableProps) {
  const [range, setRange] = useState<RangeFilter>(12);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rangeRows = useMemo(() => rows.slice(0, range), [rows, range]);
  const totalCount = rangeRows.length;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = rangeRows.slice(startIndex, startIndex + pageSize);

  return (
    <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] overflow-hidden">
      <div className="flex flex-col gap-3 px-5 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-white">Pricing timeline</p>
          <p className="text-[11px] text-[#6b7280]">
            Showing{' '}
            <span className="font-semibold text-[#e5e7eb]">
              {totalCount === 0
                ? 0
                : `${startIndex + 1}–${Math.min(startIndex + pageSize, totalCount)}`}
            </span>{' '}
            of <span className="tabular-nums">{totalCount}</span> weeks
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide">
            <div className="inline-flex rounded-full bg-[#101010] p-1 text-[11px] border border-[#2d2d2d] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              {([8, 12, 24] as RangeFilter[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRange(value);
                    setPage(1);
                  }}
                  className={cn(
                    'h-8 px-3 text-[11px] font-medium !rounded-full',
                    'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]',
                    range === value &&
                      'bg-[#161616] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-[#161616]',
                  )}
                >
                  Last {value} weeks
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#2d2d2d]">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <p className="text-sm font-medium text-[#555]">No pricing data yet</p>
            <p className="text-xs text-[#444] mt-1">
              Snapshots appear once weekly pricing is recorded.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                  <TableHead className="w-[140px]">Week</TableHead>
                  {tierOrder.map((t) => (
                    <TableHead key={t.key} className="text-right">
                      {t.label}
                    </TableHead>
                  ))}
                  {tierOrder.map((t) => (
                    <TableHead
                      key={`${t.key}:subs`}
                      className="text-right hidden lg:table-cell"
                    >
                      {t.label} subs
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((row) => (
                  <TableRow key={row.weekStartDate} className="border-[#2d2d2d]">
                    <TableCell className="text-xs text-[#e5e7eb] tabular-nums">
                      {formatWeek(row.weekStartDate)}
                    </TableCell>
                    {tierOrder.map((t) => {
                      const v = row.tiers[t.key];
                      return (
                        <TableCell
                          key={t.key}
                          className="text-right text-xs text-white tabular-nums font-semibold"
                        >
                          {v?.weeklyPremiumInr != null
                            ? `₹${Number(v.weeklyPremiumInr).toLocaleString('en-IN')}`
                            : '—'}
                        </TableCell>
                      );
                    })}
                    {tierOrder.map((t) => {
                      const v = row.tiers[t.key];
                      return (
                        <TableCell
                          key={`${t.key}:subs`}
                          className="text-right text-xs text-[#9ca3af] tabular-nums hidden lg:table-cell"
                        >
                          {v?.subscriberCount ?? 0}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
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

