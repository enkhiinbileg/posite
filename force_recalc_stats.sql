
-- Recalculate Translator Stats
-- Run this in Supabase SQL Editor to fix "0 Chapters" issue

DO $$
BEGIN
    -- 1. Upsert stats for EVERY translator who has chapters
    INSERT INTO translator_stats (translator_id, total_chapters_translated, updated_at)
    SELECT 
        translator_id, 
        COUNT(*) as actual_count, 
        NOW()
    FROM chapters
    WHERE translator_id IS NOT NULL
    GROUP BY translator_id
    ON CONFLICT (translator_id) 
    DO UPDATE SET 
        total_chapters_translated = EXCLUDED.total_chapters_translated,
        updated_at = NOW();

    -- 2. (Optional) Set count to 0 for translators with NO chapters
    -- This ensures strict accuracy
    UPDATE translator_stats
    SET total_chapters_translated = 0
    WHERE translator_id NOT IN (SELECT DISTINCT translator_id FROM chapters WHERE translator_id IS NOT NULL);

    RAISE NOTICE '✅ Translator Stats have been fully recalculated!';
END $$;
