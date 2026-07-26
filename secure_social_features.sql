-- SECURE SOCIAL FEATURES (Production Ready - CORRECTED)
-- This script Re-Enables security but keeps data visible.
-- Run this to finalize your database security.

BEGIN;

-- 1. Re-Enable RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Ensure Clean Slate for Policies (DROP EVERYTHING)

-- ... Drop OLD names ...
DROP POLICY IF EXISTS "Everyone can view likes" ON likes;
DROP POLICY IF EXISTS "Authenticated users can toggle likes" ON likes;
DROP POLICY IF EXISTS "Users can insert likes" ON likes;
DROP POLICY IF EXISTS "Users can delete likes" ON likes;

DROP POLICY IF EXISTS "Everyone can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can post comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "Users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can delete comments" ON comments;

DROP POLICY IF EXISTS "Public profiles" ON profiles;
DROP POLICY IF EXISTS "Everyone can view profiles" ON profiles;

-- ... Drop NEW names (The ones we are about to create, to avoid "already exists" error) ...
DROP POLICY IF EXISTS "Public View Likes" ON likes;
DROP POLICY IF EXISTS "User Toggle Likes" ON likes;
DROP POLICY IF EXISTS "User Delete Likes" ON likes;

DROP POLICY IF EXISTS "Public View Comments" ON comments;
DROP POLICY IF EXISTS "User Post Comments" ON comments;
DROP POLICY IF EXISTS "User Delete Comments" ON comments;

DROP POLICY IF EXISTS "Public View Profiles" ON profiles;

-- 3. Open Visibility (Windows are open for viewing)
CREATE POLICY "Public View Likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Public View Comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Public View Profiles" ON profiles FOR SELECT USING (true);

-- 4. Secure Actions (Only owners can touch)
-- Likes
CREATE POLICY "User Toggle Likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User Delete Likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "User Post Comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User Delete Comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';

COMMIT;
