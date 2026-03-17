'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type SystemLog = {
  id: string;
  event_type: string;
  severity: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const SEVERITY_STYLES: Record<
  string,
  { badgeClass: string }
> = {
  info: { badgeClass: 'border-[#2d2d2d] bg-[#262626] text-[#666]' },
  warning: {
    badgeClass: 'border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#f59e0b]',
  },
  error: {
    badgeClass: 'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#ef4444]',
  },
};

function formatLogTime(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDetails(metadata: Record<string, unknown>): string {
  if (metadata?.claims_created != null && metadata?.duration_ms != null) {
    return `${metadata.claims_created} claims · ${metadata.duration_ms}ms`;
  }
  if (metadata?.action) {
    return `${metadata.action} by ${metadata.reviewed_by ?? 'admin'}`;
  }
  if (metadata?.error) {
    return String(metadata.error).slice(0, 60);
  }
  return '—';
}

type SeverityFilter = 'all' | 'info' | 'warning' | 'error';
type WindowFilter = '24h' | '6h' | '1h' | 'all';

interface SystemLogsTableProps {
  logs: SystemLog[];
}

export function SystemLogsTable({ logs }: SystemLogsTableProps) {
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('24h');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const now = useMemo(() => Date.now(), []);

  const filteredLogs = useMemo(() => {
    const base = logs.filter((log) => {
      if (severity !== 'all' && log.severity !== severity) return false;

      if (windowFilter !== 'all') {
        const diffMs = now - new Date(log.created_at).getTime();
        const hours =
          windowFilter === '1h' ? 1 : windowFilter === '6h' ? 6 : 24;
        if (diffMs > hours * 60 * 60 * 1000) return false;
      }

      if (query.trim()) {
        const q = query.toLowerCase();
        const event = log.event_type.replace(/_/g, ' ');
        const details = formatDetails(log.metadata);
        if (
          !event.toLowerCase().includes(q) &&
          !details.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });

    return base;
  }, [logs, severity, windowFilter, query, now]);

  const totalCount = logs.length;
  const visibleCount = filteredLogs.length;

  const totalPages = Math.max(1, Math.ceil(visibleCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 px-5 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-white">
            Event Log
          </p>
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
            <span className="tabular-nums">
              {totalCount}
            </span>{' '}
            events
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide">
            <div className="inline-flex rounded-full bg-[#101010] p-1 text-[11px] border border-[#2d2d2d] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              {(['all', 'info', 'warning', 'error'] as SeverityFilter[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSeverity(value)}
                  className={cn(
                    'h-8 px-3 text-[11px] font-medium !rounded-full',
                    'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]',
                    severity === value &&
                      'bg-[#161616] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-[#161616]',
                  )}
                >
                  {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide">
            <div className="inline-flex rounded-full bg-[#101010] p-1 text-[11px] border border-[#2d2d2d] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              {(['1h', '6h', '24h', 'all'] as WindowFilter[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setWindowFilter(value)}
                  className={cn(
                    'h-8 px-3 text-[11px] font-medium !rounded-full',
                    'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]',
                    windowFilter === value &&
                      'bg-[#161616] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-[#161616]',
                  )}
                >
                  {value === 'all' ? 'All time' : `Last ${value}`}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative w-full md:w-56">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#4b5563]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter events…"
              className="h-8 pl-8 pr-3 bg-[#050505] border-[#2d2d2d] text-xs placeholder:text-[#4b5563] rounded-full focus-visible:ring-2 focus-visible:ring-white/10"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#2d2d2d]">
        {visibleCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <p className="text-sm font-medium text-[#555]">
              No events match the current filters
            </p>
            <p className="text-xs text-[#444] mt-1">
              Try widening the time window or clearing the search.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                  <TableHead className="w-[90px]">Severity</TableHead>
                  <TableHead className="w-[160px]">Event</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[140px] text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => {
                  const sev =
                    SEVERITY_STYLES[log.severity] ?? SEVERITY_STYLES.info;
                  return (
                    <TableRow key={log.id} className="border-[#2d2d2d]">
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'rounded-full text-[10px] font-semibold px-2 py-0 border',
                            sev.badgeClass,
                          )}
                        >
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#9ca3af]">
                        {log.event_type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-xs text-[#555] truncate max-w-[340px]">
                        {formatDetails(log.metadata)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#555] tabular-nums">
                        {formatLogTime(log.created_at)}
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
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
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

