
-- ==========================================
-- 🛠️ DATABASE SCHEMA FIX: MISSING UNIQUE CONSTRAINTS
-- ==========================================
-- This script adds the unique constraints required for the 'upsert' operations
-- used in publishChapterAction and updateReadingProgressAction.
-- Run this in your Supabase SQL Editor and Neon Console.

-- 1. chapters table
-- Required for: publishChapterAction (upsert on Conflict: webtoon_id, chapter_number)
ALTER TABLE chapters 
ADD CONSTRAINT unique_webtoon_chapter UNIQUE (webtoon_id, chapter_number);

-- 2. reading_progress table
-- Required for: updateReadingProgressAction (upsert on Conflict: user_id, chapter_id)
-- Note: If this already exists, it will throw an error. Run the check below first if unsure.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_chapter' AND conrelid = 'reading_progress'::regclass
    ) THEN
        ALTER TABLE reading_progress 
        ADD CONSTRAINT unique_user_chapter UNIQUE (user_id, chapter_id);
    END IF;
END $$;

-- 3. Reload schema cache for PostgREST (Supabase specific)
NOTIFY pgrst, 'reload schema';

RAISE NOTICE '✅ Missing unique constraints added successfully!';
