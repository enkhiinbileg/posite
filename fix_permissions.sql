
-- Fix Webtoons RLS Policies
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on webtoons (if not already)
ALTER TABLE webtoons ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing SELECT policies to ensure a clean slate
DROP POLICY IF EXISTS "Enable read access for all users" ON webtoons;
DROP POLICY IF EXISTS "Public can view webtoons" ON webtoons;
DROP POLICY IF EXISTS "Everyone can view webtoons" ON webtoons;

-- 3. Create a PERMISSIVE policy allowing everyone to read webtoons
CREATE POLICY "Public can view webtoons"
ON webtoons FOR SELECT
USING (true);

-- 4. Ensure Admins can do everything
CREATE POLICY "Admins can do everything on webtoons"
ON webtoons FOR ALL
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
