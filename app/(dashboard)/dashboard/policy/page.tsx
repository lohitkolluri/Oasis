import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PolicySubscribeForm } from "@/components/rider/PolicySubscribeForm";
import { ArrowLeft, FileText } from "lucide-react";
import { calculateDynamicPremium, getForecastRiskFactor, getHistoricalEventCount, getSocialRiskFactor } from "@/lib/ml/premium-calc";
import type { WeeklyPolicy } from "@/lib/types/database";

export default async function PolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const nextMonday = (() => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    d.setDate(d.getDate() + daysUntilMonday);
    return d.toISOString().split("T")[0];
  })();

  const [{ data: policies }, { data: profile }, { data: rec }, { data: plans }] =
    await Promise.all([
      supabase
        .from("weekly_policies")
        .select("*, plan_packages(name)")
        .eq("profile_id", user.id)
        .order("week_start_date", { ascending: false })
        .limit(5),
      supabase
        .from("profiles")
        .select("primary_zone_geofence, zone_latitude, zone_longitude, platform")
        .eq("id", user.id)
        .single(),
      supabase
        .from("premium_recommendations")
        .select("recommended_premium_inr")
        .eq("profile_id", user.id)
        .eq("week_start_date", nextMonday)
        .single(),
      supabase
        .from("plan_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  const zoneData = profile?.primary_zone_geofence as Record<string, unknown> | null;
  const zoneName = (zoneData?.zone_name as string) ?? null;
  const zoneLat = profile?.zone_latitude ?? null;
  const zoneLng = profile?.zone_longitude ?? null;

  let premium: number;
  if (rec?.recommended_premium_inr != null) {
    premium = Number(rec.recommended_premium_inr);
  } else {
    const [eventCount, forecastRisk, socialRisk] = await Promise.all([
      getHistoricalEventCount(supabase, zoneLat, zoneLng),
      getForecastRiskFactor(supabase, zoneLat ?? 12.97, zoneLng ?? 77.59),
      getSocialRiskFactor(supabase, zoneLat, zoneLng),
    ]);
    const engineOutput = calculateDynamicPremium({
      zoneRiskFactors: {
        heatEvents: 0,
        rainEvents: eventCount, // fallback for historic events
        trafficEvents: 0,
        socialEvents: 0
      },
      forecastRisk,
      platform: typeof profile?.platform === 'string' ? profile.platform : undefined,
      socialStrikeFrequency: socialRisk,
      riderClaimFrequency: 0, // Fallback for UI preview
    });
    premium = engineOutput.final_premium;
  }

  let activePolicy: (WeeklyPolicy & { plan_packages?: unknown }) | null =
    policies?.find((p) => p.is_active) ?? null;

  const planName =
    activePolicy?.plan_packages && typeof activePolicy.plan_packages === "object" && activePolicy.plan_packages !== null
      ? (activePolicy.plan_packages as { name?: string }).name ?? "Weekly plan"
      : "Weekly plan";

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 active:text-zinc-200 transition-colors min-h-[44px] -ml-1 px-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      {activePolicy ? (
        <>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Subscription details
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Your current coverage and payment details
            </p>
          </div>
          <PolicySubscribeForm
            profileId={user.id}
            activePolicy={activePolicy}
            planName={planName}
            existingPolicies={policies ?? []}
            plans={plans ?? []}
            suggestedPremium={premium}
            paymentSuccess={params.success === '1'}
            paymentCanceled={params.canceled === '1'}
          />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Weekly Policy
              </h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                Subscribe for weekly parametric coverage
              </p>
            </div>
            <Link
              href="/dashboard/policy/docs"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-uber-green active:text-uber-green transition-colors shrink-0 min-h-[44px] px-1"
            >
              <FileText className="h-4 w-4" />
              Policy docs
            </Link>
          </div>
          <PolicySubscribeForm
            profileId={user.id}
            activePolicy={activePolicy}
            planName={planName}
            existingPolicies={policies ?? []}
            plans={plans ?? []}
            suggestedPremium={premium}
            paymentSuccess={params.success === '1'}
            paymentCanceled={params.canceled === '1'}
          />
        </>
      )}
    </div>
  );
}
