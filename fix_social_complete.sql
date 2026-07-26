-- MASTER FIX FOR SOCIAL FEATURES
-- Run this entire script in Supabase SQL Editor

BEGIN;

-- 1. BACKFILL PROFILES (Fixes missing data for current users)
INSERT INTO public.profiles (id, username, full_name, avatar_url)
SELECT 
  id, 
  LOWER(SPLIT_PART(email, '@', 1)), 
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. RESET POLICIES (Fixes Visibility)
-- Disable first to verify
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all old policies
DROP POLICY IF EXISTS "Everyone can view likes" ON likes;
DROP POLICY IF EXISTS "Authenticated users can toggle likes" ON likes;
DROP POLICY IF EXISTS "Users can insert likes" ON likes;
DROP POLICY IF EXISTS "Users can delete likes" ON likes;

DROP POLICY IF EXISTS "Everyone can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can post comments" ON comments;
DROP POLICY IF EXISTS "Users can delete comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

DROP POLICY IF EXISTS "Public profiles" ON profiles;

-- Re-enable RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- CREATE OPEN VISIBILITY POLICIES (Important!)
CREATE POLICY "Public View Likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Public View Comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Public View Profiles" ON profiles FOR SELECT USING (true);

-- CREATE ACTION POLICIES
CREATE POLICY "User Toggle Likes" ON likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User Post Comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User Delete Comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- 3. FIX TRIGGER (Ensures future users work)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(LOWER(SPLIT_PART(new.email, '@', 1)), 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

COMMIT;
