-- Parametric trust core: append-only trigger ledger + mutable per-source health

CREATE TYPE parametric_ledger_outcome AS ENUM ('pay', 'no_pay', 'deferred');

CREATE TABLE parametric_trigger_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  adjudicator_run_id UUID,
  source TEXT NOT NULL,
  trigger_subtype TEXT,
  event_type TEXT,
  zone_lat DOUBLE PRECISION,
  zone_lng DOUBLE PRECISION,
  observed_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule_version TEXT NOT NULL,
  outcome parametric_ledger_outcome NOT NULL,
  disruption_event_id UUID REFERENCES live_disruption_events(id) ON DELETE SET NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  claims_created INT NOT NULL DEFAULT 0,
  payouts_initiated INT NOT NULL DEFAULT 0,
  latency_ms INT,
  error_message TEXT,
  is_dry_run BOOLEAN NOT NULL DEFAULT FALSE,
  dry_run_rule_version TEXT,
  replay_of_disruption_id UUID REFERENCES live_disruption_events(id) ON DELETE SET NULL
);

CREATE INDEX idx_parametric_ledger_created ON parametric_trigger_ledger(created_at DESC);
CREATE INDEX idx_parametric_ledger_run ON parametric_trigger_ledger(adjudicator_run_id)
  WHERE adjudicator_run_id IS NOT NULL;
CREATE INDEX idx_parametric_ledger_source ON parametric_trigger_ledger(source, created_at DESC);
CREATE INDEX idx_parametric_ledger_outcome ON parametric_trigger_ledger(outcome, created_at DESC);

COMMENT ON TABLE parametric_trigger_ledger IS
  'Append-only audit: source, observed values, rule version, outcome (pay/no_pay/deferred), evidence ref to disruption row';

CREATE OR REPLACE FUNCTION prevent_parametric_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'parametric_trigger_ledger is append-only';
END;
$$;

CREATE TRIGGER tr_parametric_ledger_append_only
  BEFORE UPDATE OR DELETE ON parametric_trigger_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_parametric_ledger_mutation();

ALTER TABLE parametric_trigger_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access parametric_trigger_ledger"
  ON parametric_trigger_ledger FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can select parametric_trigger_ledger"
  ON parametric_trigger_ledger FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE TABLE parametric_source_health (
  source_id TEXT PRIMARY KEY,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_observed_at TIMESTAMPTZ,
  error_streak INT NOT NULL DEFAULT 0,
  success_streak INT NOT NULL DEFAULT 0,
  avg_latency_ms DOUBLE PRECISION,
  last_latency_ms INT,
  is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_of TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE parametric_source_health IS
  'Per-ingestion source freshness, streaks, latency; optional fallback_of when this source backs up another';

CREATE INDEX idx_parametric_source_health_observed ON parametric_source_health(last_observed_at DESC NULLS LAST);

ALTER TABLE parametric_source_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access parametric_source_health"
  ON parametric_source_health FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can select parametric_source_health"
  ON parametric_source_health FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );
