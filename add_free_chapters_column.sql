-- Add free_chapters column to webtoons table
ALTER TABLE webtoons ADD COLUMN IF NOT EXISTS free_chapters INTEGER DEFAULT 1;

-- Set some existing ones to have more free chapters if desired
-- UPDATE webtoons SET free_chapters = 3 WHERE id = ...;
