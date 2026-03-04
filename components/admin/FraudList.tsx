"use client";

import { useState } from "react";
import { ShieldAlert, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Claim {
  id: string;
  payout_amount_inr: number;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  admin_review_status?: string | null;
  reviewed_by?: string | null;
}

function ReviewButtons({ claimId, onReviewed }: { claimId: string; onReviewed: (id: string, action: "approved" | "rejected") => void }) {
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);

  async function handleAction(action: "approved" | "rejected") {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/review-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={() => handleAction("approved")}
        disabled={!!loading}
        title="Approve — clear flag, count as valid payout"
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
      >
        {loading === "approved" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle className="h-3 w-3" />
        )}
        Approve
      </button>
      <button
        onClick={() => handleAction("rejected")}
        disabled={!!loading}
        title="Reject — keep flagged, mark as invalid"
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        {loading === "rejected" ? (
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

  function handleReviewed(id: string, action: "approved" | "rejected") {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, admin_review_status: action } : c
      )
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-12 text-center">
        <ShieldAlert className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-600">No flagged claims</p>
      </div>
    );
  }

  const pending = claims.filter((c) => !c.admin_review_status);
  const reviewed = claims.filter((c) => c.admin_review_status);

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800">
            <p className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-widest">
              Pending Review ({pending.length})
            </p>
          </div>
          <div className="divide-y divide-zinc-800/70">
            {pending.map((c) => (
              <div key={c.id} className="px-5 py-3.5 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-600 tabular-nums">
                      {c.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-zinc-700">·</span>
                    <span className="text-xs font-semibold text-zinc-200 tabular-nums">
                      ₹{Number(c.payout_amount_inr).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-zinc-700">·</span>
                    <span className="text-xs text-zinc-600">
                      {new Date(c.created_at).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-amber-400 truncate">
                    {c.flag_reason ?? "Flagged — reason unknown"}
                  </p>
                </div>
                <ReviewButtons claimId={c.id} onReviewed={handleReviewed} />
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
              Reviewed ({reviewed.length})
            </p>
          </div>
          <div className="divide-y divide-zinc-800/70">
            {reviewed.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                <span className="font-mono text-xs text-zinc-700 tabular-nums">
                  {c.id.slice(0, 8)}
                </span>
                <span className="text-xs text-zinc-600 flex-1 truncate">
                  {c.flag_reason ?? "Flagged"}
                </span>
                <span className="text-xs font-semibold text-zinc-400 tabular-nums">
                  ₹{Number(c.payout_amount_inr).toLocaleString("en-IN")}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    c.admin_review_status === "approved"
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : "text-red-400 bg-red-500/10 border-red-500/20"
                  }`}
                >
                  {c.admin_review_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
