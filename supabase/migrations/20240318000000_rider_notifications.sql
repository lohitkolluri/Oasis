-- Rider notifications: autonomous push when claims/payouts are created.
-- App subscribes via Realtime and shows toast; no user action required.

CREATE TABLE IF NOT EXISTS rider_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'payout', -- payout, disruption, system
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rider_notifications_profile_unread
  ON rider_notifications (profile_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rider_notifications_profile_created
  ON rider_notifications (profile_id, created_at DESC);

ALTER TABLE rider_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders see own notifications"
  ON rider_notifications FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Service role full access notifications"
  ON rider_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE rider_notifications IS 'Autonomous notifications for riders (payout, disruption); Realtime pushes to app';

-- Enable Realtime so riders get push when a row is inserted
ALTER PUBLICATION supabase_realtime ADD TABLE rider_notifications;
