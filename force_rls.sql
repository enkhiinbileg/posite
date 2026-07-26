-- FORCE CLEANUP AND RE-APPLY RLS POLICIES
-- This script focuses ONLY on permissions (Visibility)

-- 1. Disable RLS temporarily to reset (optional but safe)
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies to clear conflicts
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

-- 3. Re-Enable RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create OPEN SELECT Policies (The most important part for visibility)
-- allow everyone (auth & anon) to see data
CREATE POLICY "Everyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Everyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);

-- 5. Create ACTION Policies
CREATE POLICY "Users can insert likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete likes" ON likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- 6. Reload
NOTIFY pgrst, 'reload schema';
