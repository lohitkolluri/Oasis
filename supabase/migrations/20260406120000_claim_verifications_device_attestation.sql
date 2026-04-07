-- Phase 3: device attestation signals for fraud detection
-- Adds optional fields captured during claim location verification.

ALTER TABLE claim_verifications
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC,
  ADD COLUMN IF NOT EXISTS imu_variance NUMERIC,
  ADD COLUMN IF NOT EXISTS gnss_snr_variance NUMERIC,
  ADD COLUMN IF NOT EXISTS dev_settings_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_mock_location BOOLEAN,
  ADD COLUMN IF NOT EXISTS play_integrity_pass BOOLEAN,
  ADD COLUMN IF NOT EXISTS os_signature_valid BOOLEAN,
  ADD COLUMN IF NOT EXISTS rooted_device BOOLEAN,
  ADD COLUMN IF NOT EXISTS device_attestation JSONB;

CREATE INDEX IF NOT EXISTS idx_claim_verifications_device_fingerprint
  ON claim_verifications(device_fingerprint);

