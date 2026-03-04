-- Plan packages: different tiers riders can subscribe to (weekly model)
CREATE TABLE plan_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weekly_premium_inr NUMERIC(10, 2) NOT NULL,
  payout_per_claim_inr NUMERIC(10, 2) NOT NULL,
  max_claims_per_week INT DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plan_packages_active ON plan_packages(is_active) WHERE is_active = true;

ALTER TABLE plan_packages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active plans
CREATE POLICY "Authenticated can view active plans"
  ON plan_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Service role (admin) can do everything
CREATE POLICY "Service role full access plans"
  ON plan_packages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE plan_packages IS 'Insurance plan tiers - Basic, Standard, Premium - weekly pricing';

-- Add plan_id to weekly_policies (nullable for backward compat)
ALTER TABLE weekly_policies
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plan_packages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_policies_plan ON weekly_policies(plan_id);

-- Seed default plans
INSERT INTO plan_packages (slug, name, description, weekly_premium_inr, payout_per_claim_inr, max_claims_per_week, sort_order)
VALUES
  ('basic', 'Basic', 'Essential income protection for low-risk zones', 79, 300, 2, 1),
  ('standard', 'Standard', 'Balanced coverage for most delivery partners', 99, 400, 2, 2),
  ('premium', 'Premium', 'Maximum coverage for high-risk zones', 149, 600, 3, 3)
ON CONFLICT (slug) DO NOTHING;
