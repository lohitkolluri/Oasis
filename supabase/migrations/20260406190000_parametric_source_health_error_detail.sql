-- Add error detail to parametric_source_health for debugging vendor failures.

ALTER TABLE parametric_source_health
  ADD COLUMN IF NOT EXISTS last_error_detail TEXT;

-- Extend atomic touch function to persist error detail on failures.
CREATE OR REPLACE FUNCTION touch_parametric_source_health(
  p_source_id TEXT,
  p_ok BOOLEAN,
  p_latency_ms INT,
  p_observed_at TIMESTAMPTZ,
  p_is_fallback BOOLEAN DEFAULT NULL,
  p_fallback_of TEXT DEFAULT NULL,
  p_error_detail TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO parametric_source_health (
    source_id,
    last_observed_at,
    last_success_at,
    last_error_at,
    last_error_detail,
    error_streak,
    success_streak,
    avg_latency_ms,
    last_latency_ms,
    is_fallback,
    fallback_of,
    updated_at
  )
  VALUES (
    p_source_id,
    p_observed_at,
    CASE WHEN p_ok THEN p_observed_at ELSE NULL END,
    CASE WHEN NOT p_ok THEN p_observed_at ELSE NULL END,
    CASE WHEN NOT p_ok THEN p_error_detail ELSE NULL END,
    CASE WHEN p_ok THEN 0 ELSE 1 END,
    CASE WHEN p_ok THEN 1 ELSE 0 END,
    CASE
      WHEN p_ok AND p_latency_ms IS NOT NULL THEN p_latency_ms::DOUBLE PRECISION
      ELSE NULL
    END,
    p_latency_ms,
    COALESCE(p_is_fallback, FALSE),
    p_fallback_of,
    p_observed_at
  )
  ON CONFLICT (source_id) DO UPDATE SET
    last_observed_at = p_observed_at,
    last_success_at = CASE
      WHEN p_ok THEN p_observed_at
      ELSE parametric_source_health.last_success_at
    END,
    last_error_at = CASE
      WHEN NOT p_ok THEN p_observed_at
      ELSE parametric_source_health.last_error_at
    END,
    last_error_detail = CASE
      WHEN NOT p_ok THEN p_error_detail
      ELSE parametric_source_health.last_error_detail
    END,
    error_streak = CASE
      WHEN p_ok THEN 0
      ELSE parametric_source_health.error_streak + 1
    END,
    success_streak = CASE
      WHEN p_ok THEN parametric_source_health.success_streak + 1
      ELSE 0
    END,
    avg_latency_ms = CASE
      WHEN p_ok AND p_latency_ms IS NOT NULL THEN
        CASE
          WHEN parametric_source_health.avg_latency_ms IS NULL THEN p_latency_ms::DOUBLE PRECISION
          ELSE parametric_source_health.avg_latency_ms * 0.85 + p_latency_ms::DOUBLE PRECISION * 0.15
        END
      ELSE parametric_source_health.avg_latency_ms
    END,
    last_latency_ms = COALESCE(p_latency_ms, parametric_source_health.last_latency_ms),
    is_fallback = CASE
      WHEN p_is_fallback IS NOT NULL THEN p_is_fallback
      ELSE parametric_source_health.is_fallback
    END,
    fallback_of = CASE
      WHEN p_fallback_of IS NOT NULL THEN p_fallback_of
      ELSE parametric_source_health.fallback_of
    END,
    updated_at = p_observed_at;
END;
$$;

REVOKE ALL ON FUNCTION touch_parametric_source_health(TEXT, BOOLEAN, INT, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION touch_parametric_source_health(TEXT, BOOLEAN, INT, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) TO service_role;

COMMENT ON COLUMN parametric_source_health.last_error_detail IS
  'Last observed failure reason (HTTP status/code, JSON error, timeout, parse), for debugging vendor issues';

