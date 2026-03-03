-- Weekly policies: premium model per rider per week
CREATE TABLE weekly_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  weekly_premium_inr NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_week_range CHECK (week_end_date >= week_start_date)
);

-- Index for fast lookups by profile and active status
CREATE INDEX idx_weekly_policies_profile_active ON weekly_policies(profile_id, is_active);
CREATE INDEX idx_weekly_policies_week_dates ON weekly_policies(week_start_date, week_end_date);

ALTER TABLE weekly_policies ENABLE ROW LEVEL SECURITY;

-- RLS: Riders see only their own policies
CREATE POLICY "Users can view own policies"
  ON weekly_policies FOR SELECT
  USING (
    profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own policies"
  ON weekly_policies FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own policies"
  ON weekly_policies FOR UPDATE
  USING (
    profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

COMMENT ON TABLE weekly_policies IS 'Weekly premium policies - financial model is strictly weekly per rulebook';
