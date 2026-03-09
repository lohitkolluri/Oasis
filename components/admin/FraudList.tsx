'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { useState } from 'react';

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
      <button
        onClick={() => handleAction('approved')}
        disabled={!!loading}
        title="Approve. Clear flag, count as valid payout"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 hover:bg-[#22c55e]/15 hover:border-[#22c55e]/30 transition-all disabled:opacity-50"
      >
        {loading === 'approved' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle className="h-3 w-3" />
        )}
        Approve
      </button>
      <button
        onClick={() => handleAction('rejected')}
        disabled={!!loading}
        title="Reject. Keep flagged, mark as invalid"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/15 hover:border-[#ef4444]/30 transition-all disabled:opacity-50"
      >
        {loading === 'rejected' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
        Reject
      </button>
    </div>
  );
}

export function FraudList({ claims: initialClaims }: { claims: Claim[] }) {
  const [claims, setClaims] = useState(initialClaims);

  function handleReviewed(id: string, action: 'approved' | 'rejected') {
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, admin_review_status: action } : c)));
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl px-5 py-14 text-center">
        <ShieldAlert className="h-8 w-8 text-[#3a3a3a] mx-auto mb-3" />
        <p className="text-sm text-[#666666]">No flagged claims. Queue is clear</p>
      </div>
    );
  }

  const pending = claims.filter((c) => !c.admin_review_status);
  const reviewed = claims.filter((c) => c.admin_review_status);

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#161616]/80 backdrop-blur border border-[#f59e0b]/20 rounded-2xl overflow-hidden"
          style={{
            boxShadow: '0 0 20px rgba(255,255,255,0.03), 0 0 20px rgba(245, 158, 11, 0.06)',
          }}
        >
          <div className="px-5 py-3.5 border-b border-[#2d2d2d] flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b] shrink-0" />
            <p className="text-xs font-semibold text-[#f59e0b]">Pending Review</p>
            <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
              {pending.length}
            </span>
          </div>
          <div className="divide-y divide-[#2d2d2d]">
            {pending.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className="px-5 py-4 flex items-start gap-4 hover:bg-[#1e1e1e] transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-[#3a3a3a] tabular-nums bg-[#262626] px-2 py-0.5 rounded">
                      {c.id.slice(0, 8)}
                    </span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      ₹{Number(c.payout_amount_inr).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-[#666666]">
                      {new Date(c.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-[#f59e0b] truncate">
                    {c.flag_reason ?? 'Flagged. Reason unknown'}
                  </p>
                </div>
                <ReviewButtons claimId={c.id} onReviewed={handleReviewed} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {reviewed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.03)]"
        >
          <div className="px-5 py-3.5 border-b border-[#2d2d2d] flex items-center gap-2">
            <p className="text-xs font-medium text-[#666666] uppercase tracking-[0.1em]">
              Reviewed
            </p>
            <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#262626] text-[#666666]">
              {reviewed.length}
            </span>
          </div>
          <div className="divide-y divide-[#2d2d2d]">
            {reviewed.map((c) => (
              <div
                key={c.id}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#1e1e1e] transition-colors"
              >
                <span className="font-mono text-[10px] text-[#3a3a3a] tabular-nums bg-[#262626] px-2 py-0.5 rounded">
                  {c.id.slice(0, 8)}
                </span>
                <span className="text-xs text-[#666666] flex-1 truncate">
                  {c.flag_reason ?? 'Flagged'}
                </span>
                <span className="text-sm font-bold text-white tabular-nums">
                  ₹{Number(c.payout_amount_inr).toLocaleString('en-IN')}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                    c.admin_review_status === 'approved'
                      ? 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20'
                      : 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20'
                  }`}
                >
                  {c.admin_review_status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
