'use client';

import { gooeyToast } from 'goey-toast';
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ClaimReviewButtons({
  claimId,
  disabled,
}: {
  claimId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null);

  async function act(action: 'approved' | 'rejected') {
    setLoading(action);
    try {
      const res = await fetch('/api/admin/review-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      gooeyToast.success(action === 'approved' ? 'Claim approved' : 'Claim rejected');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      gooeyToast.error('Failed to review claim', { description: msg });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => act('approved')}
        disabled={disabled || !!loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 hover:bg-[#22c55e]/15 hover:border-[#22c55e]/30 transition-colors disabled:opacity-50"
        title="Mark reviewed: approved"
      >
        {loading === 'approved' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ThumbsUp className="h-3 w-3" />
        )}
        Approve
      </button>
      <button
        type="button"
        onClick={() => act('rejected')}
        disabled={disabled || !!loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/15 hover:border-[#ef4444]/30 transition-colors disabled:opacity-50"
        title="Mark reviewed: rejected"
      >
        {loading === 'rejected' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ThumbsDown className="h-3 w-3" />
        )}
        Reject
      </button>
    </div>
  );
}

