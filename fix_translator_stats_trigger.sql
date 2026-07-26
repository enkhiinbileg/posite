
-- Run this in Supabase SQL Editor to enable auto-updating stats

-- 1. Create Function to handle chapter (and view) stats
CREATE OR REPLACE FUNCTION update_translator_chapter_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.translator_id IS NOT NULL THEN
            INSERT INTO translator_stats (translator_id, total_chapters_translated, updated_at)
            VALUES (NEW.translator_id, 1, NOW())
            ON CONFLICT (translator_id)
            DO UPDATE SET
                total_chapters_translated = translator_stats.total_chapters_translated + 1,
                updated_at = NOW();
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.translator_id IS NOT NULL THEN
            UPDATE translator_stats
            SET total_chapters_translated = GREATEST(0, total_chapters_translated - 1),
                updated_at = NOW()
            WHERE translator_id = OLD.translator_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger on Chapters
DROP TRIGGER IF EXISTS on_chapter_change_update_stats ON chapters;
CREATE TRIGGER on_chapter_change_update_stats
AFTER INSERT OR DELETE ON chapters
FOR EACH ROW
EXECUTE FUNCTION update_translator_chapter_stats();

-- 3. Backfill existing data
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT translator_id, COUNT(*) as count FROM chapters WHERE translator_id IS NOT NULL GROUP BY translator_id LOOP
        INSERT INTO translator_stats (translator_id, total_chapters_translated, updated_at)
        VALUES (r.translator_id, r.count, NOW())
        ON CONFLICT (translator_id)
        DO UPDATE SET
            total_chapters_translated = r.count,
            updated_at = NOW();
    END LOOP;
END $$;
