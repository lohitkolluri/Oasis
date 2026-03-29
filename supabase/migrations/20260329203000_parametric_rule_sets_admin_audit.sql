-- P1: Versioned parametric rule sets (thresholds, zones, payout ladder, exclusions) + admin audit trail

CREATE TABLE parametric_rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version_label TEXT NOT NULL UNIQUE,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  /* Partial overrides for adjudicator thresholds (merged onto code defaults at runtime). */
  triggers JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Severity bands; multiplier applied to plan payout_per_claim_inr. */
  payout_ladder JSONB NOT NULL DEFAULT '[{"severity_min":0,"severity_max":10,"multiplier":1}]'::jsonb,
  /* Trigger subtypes excluded for this version (e.g. extreme_heat). */
  excluded_subtypes TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES profiles (id) ON DELETE SET NULL
);

COMMENT ON TABLE parametric_rule_sets IS
  'Versioned parametric rules: effective_from/until window; at most one row with effective_until IS NULL (current).';

CREATE INDEX idx_parametric_rule_sets_effective
  ON parametric_rule_sets (effective_from DESC, effective_until DESC);

CREATE UNIQUE INDEX parametric_rule_sets_one_open
  ON parametric_rule_sets ((true))
  WHERE effective_until IS NULL;

ALTER TABLE parametric_trigger_ledger
  ADD COLUMN IF NOT EXISTS rule_set_id UUID REFERENCES parametric_rule_sets (id) ON DELETE SET NULL;

COMMENT ON COLUMN parametric_trigger_ledger.rule_set_id IS
  'FK to parametric_rule_sets row whose version_label matches rule_version at adjudication time.';

ALTER TABLE live_disruption_events
  ADD COLUMN IF NOT EXISTS rule_set_id UUID REFERENCES parametric_rule_sets (id) ON DELETE SET NULL;

COMMENT ON COLUMN live_disruption_events.rule_set_id IS
  'Rule set applied when this disruption was recorded (product/legal traceability).';

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES profiles (id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_admin_audit_log_created ON admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_actor ON admin_audit_log (actor_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_resource ON admin_audit_log (resource_type, resource_id, created_at DESC);

COMMENT ON TABLE admin_audit_log IS
  'Append-only admin actions (rules, payouts, policy overrides, roles). No updates/deletes.';

CREATE OR REPLACE FUNCTION prevent_admin_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$;

CREATE TRIGGER tr_admin_audit_log_append_only
  BEFORE UPDATE OR DELETE ON admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_log_mutation();

ALTER TABLE parametric_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access parametric_rule_sets"
  ON parametric_rule_sets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can select parametric_rule_sets"
  ON parametric_rule_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Service role full access admin_audit_log"
  ON admin_audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can select admin_audit_log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

INSERT INTO parametric_rule_sets (
  version_label,
  effective_from,
  effective_until,
  triggers,
  payout_ladder,
  excluded_subtypes,
  notes
)
VALUES (
  '2026.03.29',
  TIMESTAMPTZ '2000-01-01T00:00:00Z',
  NULL,
  '{
    "HEAT_THRESHOLD_C": 43,
    "HEAT_SUSTAINED_HOURS": 3,
    "RAIN_THRESHOLD_MM_H": 4,
    "AQI_MIN_THRESHOLD": 200,
    "AQI_MAX_THRESHOLD": 500,
    "AQI_EXCESS_MULTIPLIER": 1.3,
    "AQI_CHRONIC_P75_FLOOR": 200,
    "AQI_CHRONIC_MULTIPLIER": 1.15,
    "AQI_CHRONIC_MIN_THRESHOLD": 350,
    "LLM_SEVERITY_THRESHOLD": 6,
    "DEFAULT_GEOFENCE_RADIUS_KM": 15,
    "SINGLE_ZONE_RADIUS_KM": 2,
    "DUPLICATE_EVENT_RADIUS_KM": 30,
    "CANDIDATE_DEDUPE_RADIUS_KM": 30,
    "NEWS_GEOFENCE_RADIUS_KM": 20,
    "NEWS_GEOFENCE_RADIUS_KM_COUNTRY": 50,
    "TRAFFIC_CONGESTION_RATIO_THRESHOLD": 0.5,
    "TRAFFIC_MIN_CONFIDENCE": 0.2
  }'::jsonb,
  '[{"severity_min":0,"severity_max":10,"multiplier":1}]'::jsonb,
  '{}',
  'Seed row matching lib/config/constants.ts TRIGGERS + default ladder (single 1.0 band).'
)
ON CONFLICT (version_label) DO NOTHING;
