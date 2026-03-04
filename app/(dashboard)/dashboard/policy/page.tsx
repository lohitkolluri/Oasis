import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PolicySubscribeForm } from "@/components/rider/PolicySubscribeForm";
import { ArrowLeft, FileText } from "lucide-react";
import { calculateWeeklyPremium, getForecastRiskFactor, getHistoricalEventCount } from "@/lib/ml/premium-calc";

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
    .select("primary_zone_geofence, zone_latitude, zone_longitude")
    .eq("id", user.id)
    .single();

  const zoneData = profile?.primary_zone_geofence as Record<string, unknown> | null;
  const zoneName = (zoneData?.zone_name as string) ?? null;
  const zoneLat = profile?.zone_latitude ?? null;
  const zoneLng = profile?.zone_longitude ?? null;

  const nextMonday = (() => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    d.setDate(d.getDate() + daysUntilMonday);
    return d.toISOString().split("T")[0];
  })();

  const { data: rec } = await supabase
    .from("premium_recommendations")
    .select("recommended_premium_inr")
    .eq("profile_id", user.id)
    .eq("week_start_date", nextMonday)
    .single();

  let premium: number;
  if (rec?.recommended_premium_inr != null) {
    premium = Number(rec.recommended_premium_inr);
  } else {
    const eventCount = await getHistoricalEventCount(supabase, zoneLat, zoneLng);
    const forecastRisk = await getForecastRiskFactor(supabase, zoneLat ?? 12.97, zoneLng ?? 77.59);
    premium = calculateWeeklyPremium({
      zoneName,
      zoneLatitude: zoneLat,
      zoneLongitude: zoneLng,
      historicalEventCount: eventCount,
      forecastRiskFactor: forecastRisk,
    });
  }

  const activePolicy = policies?.find((p) => p.is_active) ?? null;

  const { data: plans } = await supabase
    .from("plan_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Weekly Policy</h1>
        <Link
          href="/dashboard/policy/docs"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Policy docs
        </Link>
      </div>
      <PolicySubscribeForm
        profileId={user.id}
        activePolicy={activePolicy}
        existingPolicies={policies ?? []}
        plans={plans ?? []}
        suggestedPremium={premium}
      />
    </div>
  );
}
