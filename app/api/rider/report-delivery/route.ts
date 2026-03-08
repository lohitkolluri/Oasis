/**
 * Rider self-report: "I can't deliver" when disruption wasn't detected.
 * Requires a live photo (camera only). LLM verifies; on success we create claim + payout.
 * GPS / zone data only accepted from mobile user-agents for precise location.
 * POST /api/rider/report-delivery
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMobileForGps } from "@/lib/utils/device";
import { currentWeekMonday } from "@/lib/utils/geo";
import { toDateString } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const BUCKET = "rider-reports";
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VISION_MODEL = "qwen/qwen2-vl-72b-instruct"; // or openai/gpt-4o for vision

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!isMobileForGps(userAgent)) {
    return NextResponse.json(
      { error: "Use a mobile device for precise location when reporting delivery issues." },
      { status: 403 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Multipart form with photo required" }, { status: 400 });
  }

  const formData = await request.formData();
  const type = (formData.get("type") as string) ?? null;
  const message = (formData.get("message") as string)?.trim() ?? null;
  const photo = formData.get("photo") as File | null;
  const gpsLatRaw = formData.get("gps_lat");
  const gpsLngRaw = formData.get("gps_lng");
  const gpsLat = gpsLatRaw != null ? Number(gpsLatRaw) : null;
  const gpsLng = gpsLngRaw != null ? Number(gpsLngRaw) : null;

  if (!type || type !== "cant_deliver") {
    return NextResponse.json(
      { error: "Invalid type. Use 'cant_deliver'" },
      { status: 400 },
    );
  }

  if (!photo || photo.size === 0) {
    return NextResponse.json(
      { error: "Live photo is required (camera only)." },
      { status: 400 },
    );
  }

  if (photo.size > MAX_PHOTO_SIZE) {
    return NextResponse.json({ error: "Photo must be under 5MB" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(photo.type)) {
    return NextResponse.json(
      { error: "Photo must be JPEG, PNG, or WebP" },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("zone_latitude, zone_longitude")
    .eq("id", user.id)
    .single();

  const zoneLat =
    gpsLat != null && Number.isFinite(gpsLat)
      ? gpsLat
      : profile?.zone_latitude != null
        ? Number(profile.zone_latitude)
        : null;
  const zoneLng =
    gpsLng != null && Number.isFinite(gpsLng)
      ? gpsLng
      : profile?.zone_longitude != null
        ? Number(profile.zone_longitude)
        : null;

  const admin = createAdminClient();
  const photoBuf = await photo.arrayBuffer();

  // Upload photo to storage
  let photoUrl: string | null = null;
  try {
    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, photoBuf, {
      contentType: photo.type,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    photoUrl = path;
  } catch (err) {
    console.error("Report photo upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload photo. Ensure rider-reports bucket exists." },
      { status: 500 },
    );
  }

  // Save report row
  const { data: reportRow, error: reportErr } = await supabase
    .from("rider_delivery_reports")
    .insert({
      profile_id: user.id,
      zone_lat: zoneLat,
      zone_lng: zoneLng,
      report_type: "cant_deliver",
      message: message || null,
      photo_url: photoUrl,
    })
    .select("id, created_at")
    .single();

  if (reportErr) {
    return NextResponse.json({ error: reportErr.message }, { status: 500 });
  }

  // LLM verification: genuine disruption + live photo (no screenshot/upload)
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  let verified = false;
  let verifyReason = "Verification unavailable";

  if (openRouterKey) {
    try {
      const base64 = Buffer.from(photoBuf).toString("base64");
      const dataUrl = `data:${photo.type};base64,${base64}`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You verify delivery disruption reports. Reply ONLY with valid JSON: {\"verified\": true or false, \"reason\": \"brief explanation\"}. Be strict: reject if the image looks like a screenshot, uploaded file, or not a real live photo of a disruption (weather, road, curfew, etc.).",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Rider says: "${message || "Delivery disrupted in my zone."}"

Rules: Set verified true ONLY if (1) the image shows a plausible real-world delivery disruption (weather, road block, crowd, etc.) AND (2) it looks like a live camera photo (not a screenshot, not a downloaded image). Reject if unclear or fake. Reply ONLY with JSON: {"verified": true/false, "reason": "..."}`,
                },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 256,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content ?? "";
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { verified?: boolean; reason?: string };
          verified = parsed.verified === true;
          verifyReason = parsed.reason ?? verifyReason;
        }
      }
    } catch (e) {
      console.error("LLM verify error:", e);
    }
  }

  let payout_created = false;

  if (verified) {
    const today = toDateString(new Date());
    const weekStart = currentWeekMonday().toISOString();

    // Get rider's active policy for current week
    const { data: policy } = await admin
      .from("weekly_policies")
      .select("id, profile_id, plan_id, plan_packages(payout_per_claim_inr, max_claims_per_week)")
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .lte("week_start_date", today)
      .gte("week_end_date", today)
      .single();

    if (policy) {
      const plan = policy.plan_packages as { payout_per_claim_inr?: number; max_claims_per_week?: number } | null;
      const payoutAmount = plan?.payout_per_claim_inr != null ? Number(plan.payout_per_claim_inr) : 400;
      const maxClaims = plan?.max_claims_per_week ?? 3;

      const { count: weekClaimCount } = await admin
        .from("parametric_claims")
        .select("id", { count: "exact", head: true })
        .eq("policy_id", policy.id)
        .gte("created_at", weekStart);

      if ((weekClaimCount ?? 0) < maxClaims) {
        const lat = zoneLat ?? 12.9716;
        const lng = zoneLng ?? 77.5946;

        const { data: eventRow } = await admin
          .from("live_disruption_events")
          .insert({
            event_type: "social",
            severity_score: 8,
            geofence_polygon: { type: "circle", lat, lng, radius_km: 5 },
            verified_by_llm: true,
            raw_api_data: { source: "rider_self_report", report_id: reportRow.id, message },
          })
          .select("id")
          .single();

        if (eventRow?.id) {
          const { data: claimRow, error: claimErr } = await admin
            .from("parametric_claims")
            .insert({
              policy_id: policy.id,
              disruption_event_id: eventRow.id,
              payout_amount_inr: payoutAmount,
              status: "pending_verification",
              is_flagged: false,
            })
            .select("id")
            .single();

          if (!claimErr && claimRow) {
            // Payout only after rider verifies location (see verify-location API)
            try {
              await admin.from("rider_notifications").insert({
                profile_id: user.id,
                title: "Report verified — verify location",
                body: `Verify your location in the app to receive ₹${payoutAmount}.`,
                type: "payout",
                metadata: { claim_id: claimRow.id, amount_inr: payoutAmount, source: "self_report" },
              });
            } catch {
              // optional
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    id: reportRow.id,
    created_at: reportRow.created_at,
    verified,
    reason: verifyReason,
    payout_created,
  });
}
