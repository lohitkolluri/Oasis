-- Add face verification columns to profiles for liveness check during onboarding
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS face_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.face_photo_url IS 'Supabase Storage path to face liveness verification photo';
COMMENT ON COLUMN profiles.face_verified IS 'Whether LLM liveness verification passed';
