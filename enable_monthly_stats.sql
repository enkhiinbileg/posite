
-- 🗓️ ENABLE MONTHLY STATS (Royalty Pool Requirement)

-- 1. Create Monthly Stats Table
CREATE TABLE IF NOT EXISTS translator_monthly_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    translator_id UUID REFERENCES auth.users(id) NOT NULL,
    month_date DATE NOT NULL, -- First day of the month (e.g., 2026-02-01)
    vip_reads INTEGER DEFAULT 0,
    total_earnings NUMERIC DEFAULT 0, -- Earnings for THIS month only
    is_paid BOOLEAN DEFAULT FALSE, -- Has this month been paid out?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(translator_id, month_date) -- One record per translator per month
);

-- 2. Update Trigger to handle Monthly Logic
CREATE OR REPLACE FUNCTION update_translator_vip_stats_monthly()
RETURNS TRIGGER AS $$
DECLARE
    current_month DATE;
    chapter_translator UUID;
BEGIN
    -- Only count if it IS a VIP read
    IF NEW.is_vip_read = TRUE THEN
        -- Get start of current month (e.g., 2026-02-01)
        current_month := DATE_TRUNC('month', NOW());
        
        -- Find translator of the chapter
        SELECT translator_id INTO chapter_translator 
        FROM chapters WHERE id = NEW.chapter_id;

        IF chapter_translator IS NOT NULL THEN
            -- A. Update Report for Current Month
            INSERT INTO translator_monthly_stats (translator_id, month_date, vip_reads, total_earnings)
            VALUES (chapter_translator, current_month, 1, 50) -- 50 is mock rate
            ON CONFLICT (translator_id, month_date)
            DO UPDATE SET
                vip_reads = translator_monthly_stats.vip_reads + 1,
                total_earnings = translator_monthly_stats.total_earnings + 50,
                updated_at = NOW();

            -- B. Also Update All-Time Stats (Lifetime View)
            UPDATE translator_stats
            SET vip_reads = vip_reads + 1,
                total_earnings = total_earnings + 50,
                current_balance = current_balance + 50 -- Balance accumulates until withdrawal
            WHERE translator_id = chapter_translator;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Replace the old trigger with this new Monthly one
DROP TRIGGER IF EXISTS on_read_update_vip_stats ON reading_progress;

CREATE TRIGGER on_read_update_vip_stats
AFTER INSERT ON reading_progress
FOR EACH ROW
EXECUTE FUNCTION update_translator_vip_stats_monthly();


DO $$
BEGIN
    RAISE NOTICE '✅ Monthly Stats Tracking Enabled! (Resets every 1st of month)';
END $$;
