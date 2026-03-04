-- Store computed next-week premium per rider (populated by weekly cron)
CREATE TABLE IF NOT EXISTS premium_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  recommended_premium_inr NUMERIC(10, 2) NOT NULL,
  historical_event_count INT DEFAULT 0,
  forecast_risk_factor NUMERIC(4, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_premium_recommendations_profile ON premium_recommendations(profile_id);
CREATE INDEX IF NOT EXISTS idx_premium_recommendations_week ON premium_recommendations(week_start_date);

ALTER TABLE premium_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations"
  ON premium_recommendations FOR SELECT
  USING (profile_id = auth.uid());

COMMENT ON TABLE premium_recommendations IS 'Computed next-week premium per rider, populated by weekly cron';
