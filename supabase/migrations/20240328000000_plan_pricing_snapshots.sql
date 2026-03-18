-- Snapshot plan tier pricing per week for auditability and trend analysis
CREATE TABLE IF NOT EXISTS plan_pricing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  plan_id UUID NOT NULL REFERENCES plan_packages(id) ON DELETE CASCADE,
  weekly_premium_inr NUMERIC(10, 2) NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'model')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start_date, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_pricing_snapshots_week
  ON plan_pricing_snapshots(week_start_date);
CREATE INDEX IF NOT EXISTS idx_plan_pricing_snapshots_plan
  ON plan_pricing_snapshots(plan_id);

ALTER TABLE plan_pricing_snapshots ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view pricing snapshots (read-only)
CREATE POLICY "Authenticated can view plan pricing snapshots"
  ON plan_pricing_snapshots FOR SELECT
  TO authenticated
  USING (true);

-- Service role (admin) can do everything
CREATE POLICY "Service role full access plan pricing snapshots"
  ON plan_pricing_snapshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE plan_pricing_snapshots IS 'Weekly snapshots of plan tier prices for reporting and forecasting';

-- Seed current week snapshots from active plans (one-time, forward-looking baseline).
INSERT INTO plan_pricing_snapshots (week_start_date, plan_id, weekly_premium_inr, source)
SELECT
  (date_trunc('week', NOW())::date) AS week_start_date,
  p.id AS plan_id,
  p.weekly_premium_inr,
  'manual' AS source
FROM plan_packages p
WHERE p.is_active = true
ON CONFLICT (week_start_date, plan_id) DO NOTHING;

