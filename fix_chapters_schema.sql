-- 1. Add missing columns to chapters table
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS chapter_number INTEGER,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Optional: If you want to backfill existing chapters with numbers
-- UPDATE chapters SET chapter_number = id WHERE chapter_number IS NULL;

-- 3. Reload the schema cache to fix PGRST205 error
NOTIFY pgrst, 'reload schema';
