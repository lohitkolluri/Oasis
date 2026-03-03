import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PolicySubscribeForm } from "@/components/rider/PolicySubscribeForm";
import { calculateWeeklyPremium } from "@/lib/ml/premium-calc";

export default async function PolicyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: policies } = await supabase
    .from("weekly_policies")
    .select("*")
    .eq("profile_id", user.id)
    .order("week_start_date", { ascending: false })
    .limit(5);

  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_zone_geofence")
    .eq("id", user.id)
    .single();

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const { count: eventCount } = await supabase
    .from("live_disruption_events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", fourWeeksAgo.toISOString());

  const zoneData = profile?.primary_zone_geofence as Record<string, unknown> | null;
  const zoneName = (zoneData?.zone_name as string) ?? null;
  const premium = calculateWeeklyPremium({
    zoneName,
    historicalEventCount: eventCount ?? 0,
  });

  const activePolicy = policies?.find((p) => p.is_active) ?? null;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-400 hover:text-zinc-200"
      >
        ← Back to dashboard
      </Link>
      <h1 className="text-xl font-semibold">Weekly Policy</h1>
      <PolicySubscribeForm
        profileId={user.id}
        activePolicy={activePolicy}
        existingPolicies={policies ?? []}
        premium={premium}
      />
    </div>
  );
}
