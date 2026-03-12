/**
 * Post-claim verification: GPS + delivery declaration + optional proof.
 * POST /api/claims/verify-location
 *
 * Fixes applied:
 *  - Uses shared isWithinCircle from lib/utils/geo (was duplicated)
 *  - Rejects verifications submitted more than 24 hours after claim creation
 *  - Only accepts requests from mobile user-agents for precise location
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { simulatePayout } from "@/lib/adjudicator/payouts";
import { isMobileForGps } from "@/lib/utils/device";
import { isWithinCircle } from "@/lib/utils/geo";
import { DEFAULT_ZONE, FRAUD, PAYOUT_FALLBACK_INR } from "@/lib/config/constants";
import {
  runExtendedFraudChecks,
  checkGpsAccuracy,
  checkImpossibleTravel,
} from "@/lib/fraud/detector";

export const dynamic = "force-dynamic";

const BUCKET = "rider-reports";
const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
      { error: "Use a mobile device for precise location verification." },
      { status: 403 }
    );
  }

  let claimId: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;
  let declaration = false;
  let proof: File | null = null;
  let deviceFingerprint: string | null = null;
  let gpsAccuracy: number | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    claimId = formData.get("claim_id") as string | null;
    const latS = formData.get("lat");
    const lngS = formData.get("lng");
    lat = latS != null ? parseFloat(String(latS)) : null;
    lng = lngS != null ? parseFloat(String(lngS)) : null;
    declaration = formData.get("declaration") === "true" || formData.get("declaration") === "1";
    proof = formData.get("proof") as File | null;
    deviceFingerprint = formData.get("device_fingerprint") as string | null;
    const accS = formData.get("accuracy");
    gpsAccuracy = accS != null ? parseFloat(String(accS)) : null;
  } else {
    const body = await request.json().catch(() => ({}));
    claimId = body.claim_id ?? null;
    lat = body.lat != null ? parseFloat(body.lat) : null;
    lng = body.lng != null ? parseFloat(body.lng) : null;
    declaration = body.declaration === true || body.declaration === "true";
    deviceFingerprint = body.device_fingerprint ?? null;
    gpsAccuracy = body.accuracy != null ? parseFloat(body.accuracy) : null;
  }

  if (!claimId || lat == null || !Number.isFinite(lat) || lng == null || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Missing or invalid claim_id, lat, lng" },
      { status: 400 }
    );
  }

  // GPS accuracy validation: reject readings >100m (likely spoofed)
  const gpsCheck = checkGpsAccuracy(gpsAccuracy);
  if (gpsCheck.isFlagged) {
    return NextResponse.json(
      { error: gpsCheck.reason, flagged: true },
      { status: 400 }
    );
  }

  const { data: claim } = await supabase
    .from("parametric_claims")
    .select("id, policy_id, disruption_event_id, created_at, status, payout_amount_inr")
    .eq("id", claimId)
    .single();

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status === "paid") {
    return NextResponse.json({
      verified: true,
      status: "already_paid",
      payout_initiated: false,
      message: "This claim has already been verified and paid.",
    });
  }

  // Reject verifications submitted outside the allowed window (48h)
  const claimAge =
    (Date.now() - new Date(claim.created_at).getTime()) / (1000 * 60 * 60);
  if (claimAge > FRAUD.VERIFY_WINDOW_HOURS) {
    return NextResponse.json(
      { error: `Verification window expired (${FRAUD.VERIFY_WINDOW_HOURS}h after claim creation)` },
      { status: 410 }
    );
  }

  // Impossible travel check: flag if verified at distant location too recently
  const travelCheck = await checkImpossibleTravel(supabase, user.id, lat, lng);
  if (travelCheck.isFlagged) {
    return NextResponse.json(
      { error: travelCheck.reason, flagged: true },
      { status: 400 }
    );
  }

  const { data: policy } = await supabase
    .from("weekly_policies")
    .select("profile_id")
    .eq("id", claim.policy_id)
    .single();

  if (!policy || policy.profile_id !== user.id) {
    return NextResponse.json({ error: "Not your claim" }, { status: 403 });
  }

  const { data: event } = await supabase
    .from("live_disruption_events")
    .select("geofence_polygon, raw_api_data")
    .eq("id", claim.disruption_event_id)
    .single();

  const gf = event?.geofence_polygon as { lat?: number; lng?: number; radius_km?: number } | undefined;
  const centerLat = gf?.lat ?? DEFAULT_ZONE.lat;
  const centerLng = gf?.lng ?? DEFAULT_ZONE.lng;
  const radiusKm = gf?.radius_km ?? 10;
  const raw = event?.raw_api_data as { demo?: boolean; source?: string } | undefined;
  const isDemoEvent = raw?.demo === true || raw?.source === "admin_demo_mode";

  const inside = isWithinCircle(lat, lng, centerLat, centerLng, radiusKm);
  const status = inside ? "inside_geofence" : "outside_geofence";

  let proofUrl: string | null = null;
  if (proof && proof.size > 0 && proof.size <= MAX_PROOF_SIZE && ALLOWED_PROOF_TYPES.includes(proof.type)) {
    try {
      const admin = createAdminClient();
      const ext = proof.name.split(".").pop() ?? "jpg";
      const path = `claim-proofs/${claimId}/${user.id}_${Date.now()}.${ext}`;
      const buf = await proof.arrayBuffer();
      const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
        contentType: proof.type,
        upsert: false,
      });
      if (!error) proofUrl = path;
    } catch {
      // Continue without proof
    }
  }

  const now = new Date().toISOString();
  const { error: insertErr } = await supabase.from("claim_verifications").upsert(
    {
      claim_id: claimId,
      profile_id: user.id,
      verified_lat: lat,
      verified_lng: lng,
      verified_at: now,
      status,
      declaration_confirmed: declaration,
      proof_url: proofUrl,
      declaration_at: declaration ? now : null,
    },
    { onConflict: "claim_id,profile_id" }
  );

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const admin = createAdminClient();
  if (isDemoEvent) {
    await admin
      .from("parametric_claims")
      .update({ is_flagged: false, flag_reason: null })
      .eq("id", claimId);
  } else if (inside) {
    await admin
      .from("parametric_claims")
      .update({ is_flagged: false, flag_reason: null })
      .eq("id", claimId);
  } else if (status === "outside_geofence") {
    await admin
      .from("parametric_claims")
      .update({
        is_flagged: true,
        flag_reason: "Location verification: rider GPS outside event geofence",
      })
      .eq("id", claimId);
  }

  // Run post-verification extended fraud checks (cluster, baseline, device, cross-profile)
  if (inside && claim?.disruption_event_id) {
    await runExtendedFraudChecks(
      admin,
      claimId,
      claim.disruption_event_id,
      deviceFingerprint ?? undefined,
      user.id,
    );
  }

  // Payout only after location verification (inside_geofence); prevents scam
  let payoutInitiated = false;
  if (inside && claim?.status === "pending_verification" && policy?.profile_id) {
    const amountInr = claim.payout_amount_inr != null ? Number(claim.payout_amount_inr) : PAYOUT_FALLBACK_INR;
    const txId = `oasis_verify_${Date.now()}_${claimId.slice(0, 8)}_${Math.random().toString(36).slice(2, 8)}`;
    const payoutOk = await simulatePayout(admin, claimId, policy.profile_id, amountInr);
    if (payoutOk) {
      await admin
        .from("parametric_claims")
        .update({ status: "paid", gateway_transaction_id: txId })
        .eq("id", claimId);
      payoutInitiated = true;
    }
  }

  return NextResponse.json({
    verified: true,
    status,
    payout_initiated: payoutInitiated,
    message: inside
      ? payoutInitiated
        ? "Location verified. Payout credited to your wallet."
        : "Location verified inside zone"
      : "Location recorded (outside zone)",
  });
}
