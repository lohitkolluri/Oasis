-- Add event_subtype column to distinguish heat/rain/flood/aqi/gridlock/curfew
ALTER TABLE live_disruption_events
  ADD COLUMN IF NOT EXISTS event_subtype TEXT;

CREATE INDEX IF NOT EXISTS idx_disruption_events_subtype
  ON live_disruption_events(event_subtype)
  WHERE event_subtype IS NOT NULL;

COMMENT ON COLUMN live_disruption_events.event_subtype
  IS 'Specific trigger subtype: extreme_heat, heavy_rain, flood, severe_aqi, traffic_gridlock, zone_curfew';
