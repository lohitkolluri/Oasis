-- User role for access control: rider (default) or admin (can access admin panel and modify roles)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'rider';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('rider', 'admin'));

COMMENT ON COLUMN profiles.role IS 'User role: rider (default) or admin. Admin can access /admin and modify roles.';

-- Service role needs to update profiles (e.g. admin changing user role via dashboard)
DROP POLICY IF EXISTS "Service role update profiles" ON profiles;
CREATE POLICY "Service role update profiles"
  ON profiles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
