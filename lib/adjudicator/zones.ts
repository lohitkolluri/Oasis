/**
 * Resolve active policy zones for adjudicator (deduplicated by cluster).
 */

import { DEFAULT_ZONE } from '@/lib/config/constants';
import type { SupabaseAdmin } from '@/lib/adjudicator/types';
import { clusterKey } from '@/lib/utils/geo';
import { toDateString } from '@/lib/utils/date';

export type ActiveZone = {
  lat: number;
  lng: number;
  /** Human-readable zone label set during onboarding (e.g. "Koramangala, Bengaluru") */
  label?: string | null;
  /** Number of active policies clustered into this zone bucket */
  policiesActive?: number;
};

export async function getActiveZones(
  supabase: SupabaseAdmin,
): Promise<ActiveZone[]> {
  const today = toDateString(new Date());

  const { data: policies } = await supabase
    .from('weekly_policies')
    .select('profiles!inner(zone_latitude, zone_longitude, primary_zone_geofence)')
    .eq('is_active', true)
    .lte('week_start_date', today)
    .gte('week_end_date', today)
    .not('profiles.zone_latitude', 'is', null)
    .not('profiles.zone_longitude', 'is', null);

  if (!policies || policies.length === 0) {
    return [{ lat: DEFAULT_ZONE.lat, lng: DEFAULT_ZONE.lng }];
  }

  const seen = new Map<string, ActiveZone>();
  for (const row of policies) {
    const profile = row.profiles as unknown as {
      zone_latitude: number;
      zone_longitude: number;
      primary_zone_geofence?: unknown;
    } | null;
    if (!profile || profile.zone_latitude == null || profile.zone_longitude == null) continue;
    const key = clusterKey(profile.zone_latitude, profile.zone_longitude);
    const existing = seen.get(key);
    const zoneName =
      profile.primary_zone_geofence &&
      typeof profile.primary_zone_geofence === 'object' &&
      !Array.isArray(profile.primary_zone_geofence)
        ? ((profile.primary_zone_geofence as Record<string, unknown>).zone_name as string | undefined)
        : undefined;
    if (!existing) {
      seen.set(key, {
        lat: profile.zone_latitude,
        lng: profile.zone_longitude,
        label: typeof zoneName === 'string' ? zoneName : null,
        policiesActive: 1,
      });
    } else {
      existing.policiesActive = (existing.policiesActive ?? 0) + 1;
      // Prefer a concrete label if we didn’t have one yet.
      if (!existing.label && typeof zoneName === 'string') existing.label = zoneName;
    }
  }

  return seen.size > 0
    ? Array.from(seen.values())
    : [{ lat: DEFAULT_ZONE.lat, lng: DEFAULT_ZONE.lng }];
}
