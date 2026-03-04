import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FraudList } from "@/components/admin/FraudList";

export default async function FraudPage() {
  const supabase = createAdminClient();

  const { data: claims } = await supabase
    .from("parametric_claims")
    .select(`
      id,
      payout_amount_inr,
      is_flagged,
      flag_reason,
      created_at,
      admin_review_status,
      reviewed_by,
      weekly_policies(profile_id)
    `)
    .eq("is_flagged", true)
    .order("created_at", { ascending: false });

  const pendingCount = (claims ?? []).filter((c) => !c.admin_review_status).length;

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Fraud Queue</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Claims flagged by duplicate, rapid-claims, weather mismatch, or GPS verification
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {pendingCount} pending review
          </span>
        )}
      </div>
      <FraudList claims={claims ?? []} />
    </div>
  );
}
