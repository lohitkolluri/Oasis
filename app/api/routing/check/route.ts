/**
 * OSRM routing check - returns duration and distance for a route.
 * GET /api/routing/check?from_lat=&from_lng=&to_lat=&to_lng=
 */
import { NextResponse } from "next/server";
import { checkRoute } from "@/lib/routing/osrm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fromLat = searchParams.get("from_lat");
  const fromLng = searchParams.get("from_lng");
  const toLat = searchParams.get("to_lat");
  const toLng = searchParams.get("to_lng");

  const lat = (v: string | null) => (v != null ? parseFloat(v) : NaN);
  const from = { lat: lat(fromLat), lng: lat(fromLng) };
  const to = { lat: lat(toLat), lng: lat(toLng) };

  if (
    !Number.isFinite(from.lat) ||
    !Number.isFinite(from.lng) ||
    !Number.isFinite(to.lat) ||
    !Number.isFinite(to.lng)
  ) {
    return NextResponse.json(
      { error: "Missing or invalid from_lat, from_lng, to_lat, to_lng" },
      { status: 400 }
    );
  }

  const result = await checkRoute(from, to);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}
