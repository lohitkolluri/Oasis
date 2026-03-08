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

  const { data: activePolicies } = await supabase
    .from('weekly_policies')
    .select('profile_id')
    .eq('is_active', true)
    .lte('week_start_date', today)
    .gte('week_end_date', today);

  if (!activePolicies || activePolicies.length === 0) {
    return [{ lat: DEFAULT_ZONE.lat, lng: DEFAULT_ZONE.lng }];
  }

  const profileIds = [
    ...new Set(
      (activePolicies as Array<{ profile_id: string }>).map((p) => p.profile_id),
    ),
  ];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('zone_latitude, zone_longitude')
    .in('id', profileIds)
    .not('zone_latitude', 'is', null)
    .not('zone_longitude', 'is', null);

  if (!profiles || profiles.length === 0) {
    return [{ lat: DEFAULT_ZONE.lat, lng: DEFAULT_ZONE.lng }];
  }

  const seen = new Map<string, { lat: number; lng: number }>();
  for (const p of profiles as Array<{
    zone_latitude: number;
    zone_longitude: number;
  }>) {
    if (p.zone_latitude == null || p.zone_longitude == null) continue;
    const key = clusterKey(p.zone_latitude, p.zone_longitude);
    if (!seen.has(key)) {
      seen.set(key, { lat: p.zone_latitude, lng: p.zone_longitude });
    }
  }

  return seen.size > 0
    ? Array.from(seen.values())
    : [{ lat: DEFAULT_ZONE.lat, lng: DEFAULT_ZONE.lng }];
}
