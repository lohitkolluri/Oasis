-- Disruption event types
CREATE TYPE disruption_event_type AS ENUM ('weather', 'traffic', 'social');

-- Live disruption events: from weather APIs, traffic, news
CREATE TABLE live_disruption_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type disruption_event_type NOT NULL,
  severity_score NUMERIC(4, 2) NOT NULL CHECK (severity_score >= 0 AND severity_score <= 10),
  geofence_polygon JSONB,
  verified_by_llm BOOLEAN DEFAULT false,
  raw_api_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by type and recency
CREATE INDEX idx_disruption_events_type_created ON live_disruption_events(event_type, created_at DESC);

ALTER TABLE live_disruption_events ENABLE ROW LEVEL SECURITY;

-- RLS: Service role inserts (Edge Functions). For read: riders need to see events in their zone (via app logic).
-- Public read for disruption feed; admin write via service role.
CREATE POLICY "Allow authenticated read of disruption events"
  ON live_disruption_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access"
  ON live_disruption_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE live_disruption_events IS 'Parametric triggers from weather, traffic, social APIs';
