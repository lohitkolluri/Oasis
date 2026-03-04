import Link from "next/link";
import { ArrowLeft, Shield, ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";

export default async function AdminPoliciesPage() {
  const supabase = createAdminClient();

  const { data: policies } = await supabase
    .from("weekly_policies")
    .select(`
      id,
      profile_id,
      plan_id,
      week_start_date,
      week_end_date,
      weekly_premium_inr,
      is_active,
      created_at,
      profiles(full_name, platform, primary_zone_geofence),
      plan_packages(name, slug)
    `)
    .order("week_start_date", { ascending: false })
    .limit(100);

  const zoneName = (gf: unknown) => {
    const z = gf as { zone_name?: string } | null;
    return z?.zone_name ?? "—";
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Policy Monitoring
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          All weekly policies — active and expired
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card variant="default" padding="md">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Active policies
          </p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">
            {policies?.filter((p) => p.is_active).length ?? 0}
          </p>
        </Card>
        <Card variant="default" padding="md">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Total premium (active)
          </p>
          <p className="text-2xl font-bold text-zinc-100 mt-1 tabular-nums">
            ₹{policies?.filter((p) => p.is_active).reduce((s, p) => s + Number(p.weekly_premium_inr), 0).toLocaleString("en-IN") ?? 0}
          </p>
        </Card>
        <Card variant="default" padding="md">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Plans in use
          </p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">
            {new Set(policies?.filter((p) => p.plan_id).map((p) => (p.plan_packages as { slug?: string })?.slug ?? "legacy")).size ?? 0}
          </p>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-zinc-200">Recent policies</h2>
        {policies?.map((p) => {
          const profile = p.profiles as { full_name?: string; platform?: string; primary_zone_geofence?: unknown } | null;
          const plan = p.plan_packages as { name?: string; slug?: string } | null;
          return (
            <Card key={p.id} variant="default" padding="md" className="border-zinc-800/80">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 shrink-0">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-100">
                      {profile?.full_name ?? "Unknown"} — {plan?.name ?? "Legacy"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatDate(p.week_start_date)} – {formatDate(p.week_end_date)}
                      {profile?.platform && ` · ${profile.platform}`}
                      {" · "}
                      {zoneName(profile?.primary_zone_geofence)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-medium tabular-nums text-zinc-100">
                    ₹{Number(p.weekly_premium_inr).toLocaleString("en-IN")}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-500"
                    }`}
                  >
                    {p.is_active ? "Active" : "Expired"}
                  </span>
                </div>
              </div>
              <Link
                href={`/admin/riders/${p.profile_id}`}
                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-3"
              >
                View rider <ChevronRight className="h-3 w-3" />
              </Link>
            </Card>
          );
        })}
        {(!policies || policies.length === 0) && (
          <Card variant="default" padding="lg">
            <p className="text-zinc-500 text-center py-8">No policies yet</p>
          </Card>
        )}
      </div>
    </div>
  );
}
