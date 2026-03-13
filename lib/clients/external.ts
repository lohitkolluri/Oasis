import { fetchWithRetry } from "@/lib/utils/retry";
import { EXTERNAL_APIS } from "@/lib/config/constants";
import { getTomorrowApiKey, getTomTomApiKey } from "@/lib/config/env";

export async function fetchRealtimeWeather(
  lat: number,
  lng: number,
): Promise<{ temperature?: number; precipitationIntensity?: number } | null> {
  const key = getTomorrowApiKey();
  if (!key) return null;
  const data = await fetchWithRetry<{
    data?: { values?: { temperature?: number; precipitationIntensity?: number } };
  }>(
    `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${key}`,
    undefined,
    { cacheTtlMs: EXTERNAL_APIS.CACHE_WEATHER_TTL_MS },
  );
  return data.data?.values ?? null;
}

export async function fetchTrafficSegment(
  lat: number,
  lng: number,
): Promise<{ currentSpeed?: number; freeFlowSpeed?: number; roadClosure?: boolean } | null> {
  const key = getTomTomApiKey();
  if (!key) return null;
  const data = await fetchWithRetry<{
    flowSegmentData?: { currentSpeed?: number; freeFlowSpeed?: number; roadClosure?: boolean };
  }>(
    `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${encodeURIComponent(
      key,
    )}&point=${lat},${lng}&unit=kmph`,
    undefined,
    { cacheTtlMs: EXTERNAL_APIS.CACHE_TRAFFIC_TTL_MS },
  );
  return data.flowSegmentData ?? null;
}

