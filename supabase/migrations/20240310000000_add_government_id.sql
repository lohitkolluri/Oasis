-- Add government ID verification columns to profiles for KYC onboarding
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS government_id_url TEXT,
  ADD COLUMN IF NOT EXISTS government_id_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS government_id_verification_result JSONB;

COMMENT ON COLUMN profiles.government_id_url IS 'Supabase Storage path to uploaded gov ID (Aadhaar, PAN, etc.)';
COMMENT ON COLUMN profiles.government_id_verified IS 'Whether LLM verification passed';
COMMENT ON COLUMN profiles.government_id_verification_result IS 'LLM verification output: { verified, reason }';
