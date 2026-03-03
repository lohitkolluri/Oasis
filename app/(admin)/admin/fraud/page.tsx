import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

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
      weekly_policies(profile_id)
    `)
    .eq("is_flagged", true)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        ← Back
      </Link>
      <h1 className="text-xl font-bold">Fraud Queue</h1>
      <p className="text-zinc-500 text-sm">
        Claims flagged by duplicate & rapid-claims detection
      </p>
      <ul className="space-y-2">
        {(claims ?? []).map((c) => (
          <Card key={c.id} variant="default" padding="md" className="border-amber-500/20">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-zinc-500">{c.id.slice(0, 8)}</span>
              <span className="font-medium tabular-nums">₹{Number(c.payout_amount_inr).toLocaleString()}</span>
              <span className="text-amber-400 text-sm flex-1 min-w-0 truncate">{c.flag_reason ?? "Flagged"}</span>
              <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                {new Date(c.created_at).toLocaleString()}
              </span>
            </div>
          </Card>
        ))}
        {(!claims || claims.length === 0) && (
          <Card variant="default" padding="lg">
            <p className="text-zinc-500 text-center py-4">No flagged claims</p>
          </Card>
        )}
      </ul>
    </div>
  );
}
