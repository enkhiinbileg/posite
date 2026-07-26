
-- 🔄 SYNC LIFETIME STATS
-- Recalculates 'total_views_generated' and 'vip_reads' in translator_stats
-- based on the actual DATA in reading_progress.
-- This fixes the "Total Views: 0" bug.

-- 0. FIX: Ensure Schema exists (Missing column fix)
ALTER TABLE translator_stats
ADD COLUMN IF NOT EXISTS vip_reads INTEGER DEFAULT 0;

DO $$
BEGIN
    -- 1. Update Total Views (All Reads)
    UPDATE translator_stats ts
    SET total_views_generated = (
        SELECT COUNT(*)
        FROM reading_progress rp
        JOIN chapters c ON rp.chapter_id = c.id
        WHERE c.translator_id = ts.translator_id
    );

    -- 2. Update VIP Reads (Legacy/Lifetime column)
    UPDATE translator_stats ts
    SET vip_reads = (
        SELECT COUNT(*)
        FROM reading_progress rp
        JOIN chapters c ON rp.chapter_id = c.id
        WHERE c.translator_id = ts.translator_id
        AND rp.is_vip_read = TRUE
    );

    -- 3. Update Earnings (Sync with Monthly Sum)
    -- We assume Monthly Stats are the source of truth for earnings now.
    UPDATE translator_stats ts
    SET total_earnings = (
        SELECT COALESCE(SUM(total_earnings), 0)
        FROM translator_monthly_stats tms
        WHERE tms.translator_id = ts.translator_id
    ),
    current_balance = (
        SELECT COALESCE(SUM(total_earnings), 0)
        FROM translator_monthly_stats tms
        WHERE tms.translator_id = ts.translator_id
    );

    RAISE NOTICE '✅ Lifetime Stats have been synced with Real Data!';
END $$;
