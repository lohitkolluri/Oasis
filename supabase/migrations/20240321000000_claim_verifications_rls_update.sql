-- Allow users to update their own claim_verifications rows (required for upsert on re-verify).
-- Fixes: "new row violates row-level security policy (USING expression) for table claim_verifications"

DROP POLICY IF EXISTS "Users can update own verifications" ON claim_verifications;
CREATE POLICY "Users can update own verifications"
  ON claim_verifications FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
