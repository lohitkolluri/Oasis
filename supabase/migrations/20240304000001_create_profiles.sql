-- Create platform enum for delivery partners
CREATE TYPE platform_type AS ENUM ('zepto', 'blinkit');

-- Profiles table: delivery worker data linked to auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone_number TEXT,
  platform platform_type,
  payment_routing_id TEXT,
  primary_zone_geofence JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Profile creation is handled by the app on first sign-in after auth

COMMENT ON TABLE profiles IS 'Delivery partner profiles for Q-commerce riders (Zepto/Blinkit)';
