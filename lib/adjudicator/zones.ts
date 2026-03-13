/**
 * Resolve active policy zones for adjudicator (deduplicated by cluster).
 */

import { DEFAULT_ZONE } from '@/lib/config/constants';
import type { SupabaseAdmin } from '@/lib/adjudicator/types';
import { clusterKey } from '@/lib/utils/geo';
import { toDateString } from '@/lib/utils/date';

export async function getActiveZones(
  supabase: SupabaseAdmin,
): Promise<Array<{ lat: number; lng: number }>> {
  const today = toDateString(new Date());

  const { data: policies } = await supabase
    .from('weekly_policies')
    .select('profiles!inner(zone_latitude, zone_longitude)')
    .eq('is_active', true)
    .lte('week_start_date', today)
    .gte('week_end_date', today)
    .not('profiles.zone_latitude', 'is', null)
    .not('profiles.zone_longitude', 'is', null);

  if (!policies || policies.length === 0) {
    return [{ lat: DEFAULT_ZONE.lat, lng: DEFAULT_ZONE.lng }];
  }

  const seen = new Map<string, { lat: number; lng: number }>();
  for (const row of policies) {
    const profile = row.profiles as unknown as {
      zone_latitude: number;
      zone_longitude: number;
    } | null;
    if (!profile || profile.zone_latitude == null || profile.zone_longitude == null) continue;
    const key = clusterKey(profile.zone_latitude, profile.zone_longitude);
    if (!seen.has(key)) {
      seen.set(key, { lat: profile.zone_latitude, lng: profile.zone_longitude });
    }
  }

  return seen.size > 0
    ? Array.from(seen.values())
    : [{ lat: DEFAULT_ZONE.lat, lng: DEFAULT_ZONE.lng }];
}
