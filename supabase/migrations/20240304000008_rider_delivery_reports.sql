-- Rider self-reports: "I can't deliver" with optional message and photo
CREATE TYPE rider_report_type AS ENUM ('cant_deliver');

CREATE TABLE rider_delivery_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  zone_lat NUMERIC(10, 7),
  zone_lng NUMERIC(10, 7),
  report_type rider_report_type NOT NULL DEFAULT 'cant_deliver',
  message TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rider_delivery_reports_profile ON rider_delivery_reports(profile_id);
CREATE INDEX idx_rider_delivery_reports_created ON rider_delivery_reports(created_at);
CREATE INDEX idx_rider_delivery_reports_zone ON rider_delivery_reports(zone_lat, zone_lng) WHERE zone_lat IS NOT NULL AND zone_lng IS NOT NULL;

ALTER TABLE rider_delivery_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports"
  ON rider_delivery_reports FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can view own reports"
  ON rider_delivery_reports FOR SELECT
  USING (profile_id = auth.uid());

COMMENT ON TABLE rider_delivery_reports IS 'Rider self-reports when they cannot deliver; enriches platform status';

-- Note: Create 'rider-reports' bucket in Supabase Dashboard (Storage) for optional photo uploads.
