-- 📊 REAL-TIME VIP READ TRACKING
-- This script enables live updates for VIP reads on the dashboard.

-- 1. Create Function to Track VIP Reads
CREATE OR REPLACE FUNCTION track_vip_read_for_royalty()
RETURNS TRIGGER AS $$
DECLARE
    is_user_vip BOOLEAN;
    chapter_translator_id UUID;
    current_month DATE;
BEGIN
    -- A. Check if user is VIP
    SELECT is_vip INTO is_user_vip
    FROM profiles
    WHERE id = NEW.user_id;

    -- Only proceed if user is VIP
    IF is_user_vip THEN
        -- B. Get Translator ID from Chapter
        SELECT translator_id INTO chapter_translator_id
        FROM chapters
        WHERE id = NEW.chapter_id;

        -- C. Update Monthly Stats if Translator Exists
        IF chapter_translator_id IS NOT NULL THEN
            current_month := DATE_TRUNC('month', NOW())::DATE;

            INSERT INTO translator_monthly_stats (translator_id, month_date, vip_reads, total_earnings)
            VALUES (chapter_translator_id, current_month, 1, 0)
            ON CONFLICT (translator_id, month_date)
            DO UPDATE SET
                vip_reads = translator_monthly_stats.vip_reads + 1,
                updated_at = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger on Reading Progress
DROP TRIGGER IF EXISTS tr_track_vip_reads ON reading_progress;

CREATE TRIGGER tr_track_vip_reads
AFTER INSERT ON reading_progress
FOR EACH ROW
EXECUTE FUNCTION track_vip_read_for_royalty();

NOTIFY pgrst, 'reload schema';
