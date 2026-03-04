/**
 * OSRM routing integration - foundation for traffic/closure checks.
 * Uses public demo: https://router.project-osrm.org
 */

export interface RouteCheckResult {
  duration_seconds: number;
  distance_metres: number;
}

export interface RouteCheckError {
  error: string;
}

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
