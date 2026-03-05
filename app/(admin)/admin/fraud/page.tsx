import { FraudList } from '@/components/admin/FraudList';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default async function FraudPage() {
  const supabase = createAdminClient();

  const { data: claims } = await supabase
    .from('parametric_claims')
    .select(
      `
      id,
      payout_amount_inr,
      is_flagged,
      flag_reason,
      created_at,
      admin_review_status,
      reviewed_by,
      weekly_policies(profile_id)
    `,
    )
    .eq('is_flagged', true)
    .order('created_at', { ascending: false });

  const pendingCount = (claims ?? []).filter((c) => !c.admin_review_status).length;
  const reviewedCount = (claims ?? []).filter((c) => c.admin_review_status).length;

  return (
    <div className="space-y-8 py-2">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-white transition-colors group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </Link>

      <div>
        <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.15em] mb-1">Admin Console</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Fraud Queue</h1>
        <p className="text-sm text-[#666666] mt-1">
          Claims flagged by duplicate, rapid-claims, weather mismatch, or GPS verification
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-[#161616] border border-[#f59e0b]/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-[#f59e0b]/30" />
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-[#f59e0b]" />
            <p className="text-[11px] font-medium text-[#666666] uppercase tracking-wide">Pending</p>
          </div>
          <p className={`text-3xl font-bold tabular-nums ${pendingCount > 0 ? 'text-[#f59e0b]' : 'text-white'}`}>
            {pendingCount}
          </p>
          {pendingCount > 0 && (
            <p className="text-[10px] text-[#f59e0b] mt-1">Needs review</p>
          )}
        </div>

        <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl p-5">
          <p className="text-[11px] font-medium text-[#666666] uppercase tracking-wide mb-3">Reviewed</p>
          <p className="text-3xl font-bold tabular-nums text-white">{reviewedCount}</p>
        </div>

        <div className="bg-[#161616] border border-[#2d2d2d] rounded-2xl p-5">
          <p className="text-[11px] font-medium text-[#666666] uppercase tracking-wide mb-3">Total Flagged</p>
          <p className="text-3xl font-bold tabular-nums text-white">{claims?.length ?? 0}</p>
        </div>
      </div>

      <FraudList claims={claims ?? []} />
    </div>
  );
}
