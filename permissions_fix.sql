-- 1. Foreign Key Fixes
-- We use DO blocks to avoid errors if constraints don't exist
DO $$ 
BEGIN
  -- Likes: Drop old, add new FK to profiles
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_id_fkey') THEN
    ALTER TABLE likes DROP CONSTRAINT likes_user_id_fkey;
  END IF;
  
  ALTER TABLE likes
    ADD CONSTRAINT likes_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

  -- Comments: Drop old, add new FK to profiles
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_user_id_fkey') THEN
    ALTER TABLE comments DROP CONSTRAINT comments_user_id_fkey;
  END IF;

  ALTER TABLE comments
    ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

EXCEPTION WHEN OTHERS THEN
  -- Ignore constraint errors if they already exist or other issues, usually clean slate is better but this is safer
  RAISE NOTICE 'Constraint update skipped or failed: %', SQLERRM;
END $$;


-- 2. Clean up ALL possible Policy Names (Idempotency)
-- LIKES
DROP POLICY IF EXISTS "Everyone can view likes" ON likes;
DROP POLICY IF EXISTS "Authenticated users can toggle likes" ON likes;
DROP POLICY IF EXISTS "Users can insert likes" ON likes;
DROP POLICY IF EXISTS "Users can delete likes" ON likes;
DROP POLICY IF EXISTS "Authenticated users can insert likes" ON likes; -- just in case

-- COMMENTS
DROP POLICY IF EXISTS "Everyone can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can post comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "Users can insert comments" ON comments; -- The one that caused error
DROP POLICY IF EXISTS "Users can delete comments" ON comments;

-- PROFILES
DROP POLICY IF EXISTS "Public profiles" ON profiles;


-- 3. Enable RLS (Safe to run multiple times)
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;


-- 4. Create Policies (SELECT)
CREATE POLICY "Everyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Everyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);


-- 5. Create Policies (ACTIONS)
-- Likes
CREATE POLICY "Users can insert likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete comments" ON comments FOR DELETE USING (auth.uid() = user_id);


-- 6. Reload Cache
NOTIFY pgrst, 'reload schema';
