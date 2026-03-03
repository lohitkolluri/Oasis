import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

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
      <Link href="/admin" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back
      </Link>
      <h1 className="text-xl font-bold">Fraud Queue</h1>
      <p className="text-zinc-400 text-sm">
        Claims flagged by anomaly detection
      </p>
      <ul className="space-y-2">
        {(claims ?? []).map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-4 rounded-lg bg-zinc-900 border border-amber-500/30 px-4 py-3"
          >
            <span className="font-mono text-xs">{c.id.slice(0, 8)}</span>
            <span>₹{Number(c.payout_amount_inr).toLocaleString()}</span>
            <span className="text-amber-400 text-sm">{c.flag_reason ?? "Flagged"}</span>
            <span className="ml-auto text-xs text-zinc-600">
              {new Date(c.created_at).toLocaleString()}
            </span>
          </li>
        ))}
        {(!claims || claims.length === 0) && (
          <li className="text-zinc-500 italic">No flagged claims</li>
        )}
      </ul>
    </div>
  );
}
