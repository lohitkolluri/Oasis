-- Zone coordinates for geofence-based payout targeting
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS zone_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS zone_longitude NUMERIC(10, 7);

COMMENT ON COLUMN profiles.zone_latitude IS 'Rider zone center lat for geo-matching disruptions';
COMMENT ON COLUMN profiles.zone_longitude IS 'Rider zone center lng for geo-matching disruptions';
