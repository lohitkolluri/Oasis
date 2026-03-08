/**
 * Rider self-report: "I can't deliver" with optional message and required photo.
 * POST /api/rider/report-delivery
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BUCKET = "rider-reports";
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let type: string | null = null;
  let message: string | null = null;
  let photo: File | null = null;
  let gpsLat: number | null = null;
  let gpsLng: number | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    type = (formData.get("type") as string) ?? null;
    message = (formData.get("message") as string) ?? null;
    photo = formData.get("photo") as File | null;
    const gpsLatRaw = formData.get("gps_lat");
    const gpsLngRaw = formData.get("gps_lng");
    gpsLat = gpsLatRaw != null ? Number(gpsLatRaw) : null;
    gpsLng = gpsLngRaw != null ? Number(gpsLngRaw) : null;
  } else {
    const body = await request.json().catch(() => ({}));
    type = body.type ?? null;
    message = body.message ?? null;
    gpsLat = body.gps_lat != null ? Number(body.gps_lat) : null;
    gpsLng = body.gps_lng != null ? Number(body.gps_lng) : null;
  }

  if (!type || type !== "cant_deliver") {
    return NextResponse.json(
      { error: "Invalid type. Use 'cant_deliver'" },
      { status: 400 }
    );
  }

  if (!photo || photo.size === 0) {
    return NextResponse.json(
      { error: "Photo is required. Take or upload a photo." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("zone_latitude, zone_longitude")
    .eq("id", user.id)
    .single();

  // Prefer precise device GPS when available; fall back to rider's saved zone centroid.
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

  let photoUrl: string | null = null;
  if (photo && photo.size > 0 && photo.size <= MAX_PHOTO_SIZE) {
    if (!ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json(
        { error: "Photo must be JPEG, PNG, or WebP" },
        { status: 400 }
      );
    }
    try {
      const admin = createAdminClient();
      const ext = photo.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buf = await photo.arrayBuffer();
      const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
        contentType: photo.type,
        upsert: false,
      });
      if (error) {
        console.error("Storage upload error:", error);
        return NextResponse.json(
          { error: "Failed to upload photo. Create 'rider-reports' bucket in Supabase Storage if missing." },
          { status: 500 }
        );
      }
      photoUrl = path;
    } catch (err) {
      console.error("Photo upload error:", err);
      return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
    }
  }

  const { data: row, error } = await supabase
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: row.id, created_at: row.created_at });
}
