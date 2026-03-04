-- ============================================================
-- Migration: AQI Baseline Tracking
-- Purpose  : Extract and surface adaptive AQI threshold data
--            from raw_api_data so the admin can audit zone
--            baselines and understand why triggers did/didn't fire.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. AQI ZONE BASELINES VIEW
--    Extracts baseline stats from live_disruption_events for
--    severe_aqi triggers, making per-zone chronic pollution
--    levels visible without a separate data pipeline.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW aqi_zone_baselines AS
SELECT
  (geofence_polygon->>'lat')::FLOAT                   AS zone_lat,
  (geofence_polygon->>'lng')::FLOAT                   AS zone_lng,
  ROUND((geofence_polygon->>'lat')::NUMERIC, 1)       AS cluster_lat,
  ROUND((geofence_polygon->>'lng')::NUMERIC, 1)       AS cluster_lng,
  COUNT(*)                                            AS trigger_count,
  AVG((raw_api_data->>'current_aqi')::INT)            AS avg_trigger_aqi,
  AVG((raw_api_data->>'baseline_p75')::INT)           AS avg_baseline_p75,
  AVG((raw_api_data->>'adaptive_threshold')::INT)     AS avg_adaptive_threshold,
  AVG((raw_api_data->>'excess_percent')::INT)         AS avg_excess_pct,
  MAX(created_at)                                     AS last_trigger_at
FROM live_disruption_events
WHERE
  event_type = 'weather'
  AND raw_api_data->>'trigger' = 'severe_aqi'
  AND raw_api_data->>'current_aqi' IS NOT NULL
GROUP BY
  (geofence_polygon->>'lat')::FLOAT,
  (geofence_polygon->>'lng')::FLOAT,
  ROUND((geofence_polygon->>'lat')::NUMERIC, 1),
  ROUND((geofence_polygon->>'lng')::NUMERIC, 1);

COMMENT ON VIEW aqi_zone_baselines IS
  'Per-zone AQI baseline stats extracted from adaptive trigger events. '
  'Shows which zones have chronically high pollution vs. which had genuine spikes.';

-- ──────────────────────────────────────────────────────────────
-- 2. AQI TRIGGER AUDIT FUNCTION
--    Quick lookup: "what would the adaptive threshold be for
--    a given zone right now?" — useful for manual review.
--    Returns (baseline_p75, adaptive_threshold, recommendation)
--    based on recent trigger history for that zone cluster.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_zone_aqi_baseline(
  p_lat FLOAT,
  p_lng FLOAT
) RETURNS TABLE (
  zone_lat            FLOAT,
  zone_lng            FLOAT,
  avg_baseline_p75    NUMERIC,
  avg_adaptive_threshold NUMERIC,
  trigger_count       BIGINT,
  last_trigger_at     TIMESTAMPTZ,
  chronic_pollution   BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.cluster_lat::FLOAT,
    b.cluster_lng::FLOAT,
    ROUND(b.avg_baseline_p75::NUMERIC, 0),
    ROUND(b.avg_adaptive_threshold::NUMERIC, 0),
    b.trigger_count,
    b.last_trigger_at,
    -- Mark as "chronic" if baseline p75 > 150 (like Delhi)
    (b.avg_baseline_p75 > 150) AS chronic_pollution
  FROM aqi_zone_baselines b
  WHERE
    ABS(b.cluster_lat - ROUND(p_lat::NUMERIC, 1)) < 0.15
    AND ABS(b.cluster_lng - ROUND(p_lng::NUMERIC, 1)) < 0.15
  LIMIT 1;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 3. INDEX FOR FAST AQI TRIGGER LOOKUPS
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_disruption_events_aqi_trigger
  ON live_disruption_events (event_type, created_at DESC)
  WHERE event_type = 'weather'
    AND raw_api_data->>'trigger' = 'severe_aqi';
