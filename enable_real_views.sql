
-- 1. Add 'views' column to chapters if not exists
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- 2. Backfill: Calculate existing views from reading_progress
-- This might take a second if you have millions of rows, but safely updates all counts
WITH view_counts AS (
    SELECT chapter_id, COUNT(*) as count
    FROM reading_progress
    GROUP BY chapter_id
)
UPDATE chapters c
SET views = vc.count
FROM view_counts vc
WHERE c.id = vc.chapter_id;

-- 3. Create Trigger to Auto-Increment Views
-- When a user reads a chapter (reading_progress inserted), increment chapters.views
CREATE OR REPLACE FUNCTION increment_chapter_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chapters
    SET views = views + 1
    WHERE id = NEW.chapter_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_chapter_read ON reading_progress;

CREATE TRIGGER on_chapter_read
AFTER INSERT ON reading_progress
FOR EACH ROW
EXECUTE FUNCTION increment_chapter_views();


DO $$
BEGIN
    RAISE NOTICE '✅ Real Views System Enabled! View counts backfilled and trigger set.';
END $$;
