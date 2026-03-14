'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { CopyableId } from '@/components/ui/CopyableId';
import { CheckCircle, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Claim {
  id: string;
  payout_amount_inr: number;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  admin_review_status?: string | null;
  reviewed_by?: string | null;
}

function ReviewButtons({
  claimId,
  onReviewed,
}: {
  claimId: string;
  onReviewed: (id: string, action: 'approved' | 'rejected') => void;
}) {
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null);

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
    <div className="flex items-center gap-2 shrink-0">
      <Button
        variant="ghost"
        size="xs"
        onClick={() => handleAction('approved')}
        disabled={!!loading}
        title="Approve. Clear flag, count as valid payout"
        className="gap-1.5 bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 hover:bg-[#22c55e]/15 hover:border-[#22c55e]/30 hover:text-[#22c55e]"
      >
        {loading === 'approved' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle className="h-3 w-3" />
        )}
        Approve
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => handleAction('rejected')}
        disabled={!!loading}
        title="Reject. Keep flagged, mark as invalid"
        className="gap-1.5 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/15 hover:border-[#ef4444]/30 hover:text-[#ef4444]"
      >
        {loading === 'rejected' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
        Reject
      </Button>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FraudList({ claims: initialClaims }: { claims: Claim[] }) {
  const [claims, setClaims] = useState(initialClaims);

  function handleReviewed(id: string, action: 'approved' | 'rejected') {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, admin_review_status: action } : c,
      ),
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-[#3a3a3a] mb-4" />
          <p className="text-sm font-medium text-[#555]">
            No flagged claims. Queue is clear
          </p>
          <p className="text-xs text-[#444] mt-1">
            Claims flagged by duplicate, rapid-claims, weather mismatch, or GPS
            verification will appear here
          </p>
        </div>
      </div>
    );
  }

  const pending = claims.filter((c) => !c.admin_review_status);
  const reviewed = claims.filter((c) => c.admin_review_status);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="rounded-xl border border-[#f59e0b]/25 bg-[#161616] overflow-hidden">
          <div className="border-b border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#f59e0b] shrink-0" />
              <p className="text-sm font-semibold text-[#f59e0b]">
                Pending Review
              </p>
            </div>
            <Badge
              variant="secondary"
              className="rounded-full border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-medium px-2 py-0"
            >
              {pending.length}
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                <TableHead className="w-[100px]">Claim</TableHead>
                <TableHead className="w-[90px] text-right">Amount</TableHead>
                <TableHead className="w-[110px] text-right">Date</TableHead>
                <TableHead>Flag reason</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((c) => (
                <TableRow key={c.id} className="border-[#2d2d2d]">
                  <TableCell>
                    <CopyableId value={c.id} prefix="" length={8} label="Copy claim ID" />
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-white">
                    ₹{Number(c.payout_amount_inr).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums">
                    {formatDate(c.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[#f59e0b]">
                      {c.flag_reason ?? 'Flagged. Reason unknown'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <ReviewButtons claimId={c.id} onReviewed={handleReviewed} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] overflow-hidden">
          <div className="border-b border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Reviewed</p>
            <Badge
              variant="secondary"
              className="rounded-full border-[#2d2d2d] bg-[#262626] text-[#555] text-[10px] font-medium px-2 py-0"
            >
              {reviewed.length}
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                <TableHead className="w-[100px]">Claim</TableHead>
                <TableHead className="w-[90px] text-right">Amount</TableHead>
                <TableHead className="w-[110px] text-right">Date</TableHead>
                <TableHead>Flag reason</TableHead>
                <TableHead className="w-[100px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewed.map((c) => (
                <TableRow key={c.id} className="border-[#2d2d2d]">
                  <TableCell>
                    <CopyableId value={c.id} prefix="" length={8} label="Copy claim ID" />
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-white">
                    ₹{Number(c.payout_amount_inr).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-right text-xs text-[#9ca3af] tabular-nums">
                    {formatDate(c.created_at)}
                  </TableCell>
                  <TableCell className="text-xs text-[#555] truncate max-w-[200px]">
                    {c.flag_reason ?? 'Flagged'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'rounded-full text-[10px] font-semibold px-2 py-0 border',
                        c.admin_review_status === 'approved'
                          ? 'border-[#22c55e]/20 bg-[#22c55e]/10 text-[#22c55e]'
                          : 'border-[#ef4444]/20 bg-[#ef4444]/10 text-[#ef4444]',
                      )}
                    >
                      {c.admin_review_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
