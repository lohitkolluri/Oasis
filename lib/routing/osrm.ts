/**
 * External Open Source Routing Machine (OSRM) integration client.
 * Orchestrates live mathematical routing validations against public mapping endpoints.
 */

export interface RouteCheckResult {
  duration_seconds: number;
  distance_metres: number;
}

export interface RouteCheckError {
  error: string;
}

/**
 * Calculates real-time distance and estimated traversal duration between two points.
 * Explicitly used to enforce anti-fraud geographic plausibility logic.
 *
 * @param from - Origin spatial coordinates
 * @param to - Destination spatial coordinates
 * @returns Serialized distance (in meters) and traversal duration (in seconds), or an error boundary
 */
export async function checkRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteCheckResult | RouteCheckError> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { error: `OSRM request failed: ${res.status}` };
  }
  const data = (await res.json()) as {
    code?: string;
    routes?: Array<{ duration?: number; distance?: number }>;
  };
  if (data.code !== "Ok" || !data.routes?.[0]) {
    return { error: data.code ?? "No route found" };
  }
  const route = data.routes[0];
  return {
    duration_seconds: route.duration ?? 0,
    distance_metres: route.distance ?? 0,
  };
}
