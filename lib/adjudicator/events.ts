/**
 * Disruption event persistence and duplicate detection.
 */

import { triggersFromContext } from '@/lib/adjudicator/rule-context';
import type {
  GeofenceCircle,
  SupabaseAdmin,
  TriggerCandidate,
} from '@/lib/adjudicator/types';
import { isWithinCircle } from '@/lib/utils/geo';

/** True if a same-type event in same area was created in the last hour. */
export async function isDuplicateEvent(
  supabase: SupabaseAdmin,
  candidate: TriggerCandidate,
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const geofence = candidate.geofence;

  const { data: recentEvents } = await supabase
    .from('live_disruption_events')
    .select('id, geofence_polygon')
    .eq('event_type', candidate.type)
    .gte('created_at', oneHourAgo);

  if (!recentEvents || recentEvents.length === 0) return false;

  const radiusKm = triggersFromContext().DUPLICATE_EVENT_RADIUS_KM;

  for (const existing of recentEvents) {
    const existingGf = existing.geofence_polygon as Partial<GeofenceCircle> | null | undefined;
    if (
      existingGf?.lat != null &&
      existingGf?.lng != null &&
      geofence?.lat != null &&
      geofence?.lng != null &&
      isWithinCircle(
        existingGf.lat,
        existingGf.lng,
        geofence.lat,
        geofence.lng,
        radiusKm,
      )
    ) {
      return true;
    }
  }

  return false;
}

/** Insert disruption event; returns event id or null on failure. */
export async function insertDisruptionEvent(
  supabase: SupabaseAdmin,
  candidate: TriggerCandidate,
  ruleSetId?: string | null,
): Promise<{ id: string } | null> {
  const { data: event, error } = await supabase
    .from('live_disruption_events')
    .insert({
      event_type: candidate.type,
      event_subtype: candidate.subtype ?? null,
      severity_score: candidate.severity,
      geofence_polygon: candidate.geofence ?? {},
      verified_by_llm:
        candidate.type === 'social' || candidate.type === 'traffic',
      raw_api_data: candidate.raw,
      rule_set_id: ruleSetId ?? null,
    })
    .select('id')
    .single();

  if (error || !event?.id) return null;
  return { id: event.id };
}
