-- Shared rate limit store for multi-instance/serverless. Used by API routes when Supabase is configured.

CREATE TABLE IF NOT EXISTS rate_limit_entries (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE rate_limit_entries IS 'Rate limit counters; shared across app instances when using Supabase store';

CREATE OR REPLACE FUNCTION rate_limit_check(
  p_key TEXT,
  p_window_ms BIGINT,
  p_max_req INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_row rate_limit_entries%ROWTYPE;
  v_count INT;
  v_reset_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_row FROM rate_limit_entries WHERE key = p_key;

  IF v_row.key IS NULL OR v_row.reset_at < v_now THEN
    v_count := 1;
    v_reset_at := v_now + (p_window_ms || ' milliseconds')::INTERVAL;
  ELSE
    v_count := v_row.count + 1;
    v_reset_at := v_row.reset_at;
  END IF;

  INSERT INTO rate_limit_entries (key, count, reset_at)
  VALUES (p_key, v_count, v_reset_at)
  ON CONFLICT (key) DO UPDATE SET count = v_count, reset_at = v_reset_at;

  IF v_count > p_max_req THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_sec', GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_reset_at - v_now))))
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

COMMENT ON FUNCTION rate_limit_check IS 'Atomic rate limit check; returns { allowed: boolean, retry_after_sec?: number }';
