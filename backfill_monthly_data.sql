
-- 🔙 BACKFILL MONTHLY STATS (Current Month)
-- This script calculates VIP reads for the current month and inserts them into translator_monthly_stats

-- 0. FIX: Ensure Schema exists (in case previous script failed)
ALTER TABLE reading_progress 
ADD COLUMN IF NOT EXISTS is_vip_read BOOLEAN DEFAULT FALSE;

DO $$
DECLARE
    current_month DATE := DATE_TRUNC('month', NOW()); -- e.g., 2026-02-01
    r RECORD;
BEGIN
    -- Loop through each translator and count their VIP reads for this month
    FOR r IN 
        SELECT 
            c.translator_id,
            COUNT(*) as vip_count
        FROM reading_progress rp
        JOIN chapters c ON rp.chapter_id = c.id
        WHERE 
            rp.last_read_at >= current_month -- Reads happened this month
            AND c.translator_id IS NOT NULL
            -- Re-check VIP status for backfill accuracy
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = rp.user_id 
                AND p.is_vip = TRUE 
                AND (p.vip_expiration IS NULL OR p.vip_expiration > NOW())
            )
        GROUP BY c.translator_id
    LOOP
        -- Insert/Update Monthly Stats
        INSERT INTO translator_monthly_stats (translator_id, month_date, vip_reads, total_earnings)
        VALUES (
            r.translator_id, 
            current_month, 
            r.vip_count, 
            r.vip_count * 50 -- Mock Rate: 50 MNT
        )
        ON CONFLICT (translator_id, month_date)
        DO UPDATE SET
            vip_reads = r.vip_count,
            total_earnings = r.vip_count * 50,
            updated_at = NOW();
            
        -- Also update the 'is_vip_read' flag on the reading_progress table itself
        UPDATE reading_progress rp
        SET is_vip_read = TRUE
        FROM chapters c
        WHERE rp.chapter_id = c.id
        AND c.translator_id = r.translator_id
        AND rp.last_read_at >= current_month
        AND EXISTS (
             SELECT 1 FROM profiles p 
             WHERE p.id = rp.user_id 
             AND p.is_vip = TRUE 
        );
        
    END LOOP;
    
    RAISE NOTICE '✅ Successfully backfilled Monthly Stats for % translators!', (SELECT COUNT(*) FROM translator_monthly_stats WHERE month_date = current_month);
END $$;
