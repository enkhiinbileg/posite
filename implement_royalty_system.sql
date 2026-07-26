-- 🏊‍♂️ ROYALTY POOL SYSTEM IMPLEMENTATION
-- This script transitions the system from "Fixed Rate" to "Royalty Pool" model.

-- 1. Create Finance Pool Table
-- Tracks the total revenue and the 30% pool for Translators each month
CREATE TABLE IF NOT EXISTS finance_monthly_pools (
    month_date DATE PRIMARY KEY, -- e.g., '2026-02-01'
    total_revenue NUMERIC DEFAULT 0, -- Total Platform Revenue (Input by Admin)
    translator_pool_amount NUMERIC DEFAULT 0, -- 30% of Total Revenue (or custom amount)
    total_vip_reads INTEGER DEFAULT 0, -- Total VIP reads across ALL translators
    rate_per_read NUMERIC DEFAULT 0, -- Calculated Rate (Pool / Total Reads)
    is_distributed BOOLEAN DEFAULT FALSE, -- To prevent double payments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Update the Monthly Stats Trigger
-- OLD Logic: Added +50 MNT per read immediately.
-- NEW Logic: Just count the read. Earnings are calculated at month-end.
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
            -- Update Report for Current Month (COUNT ONLY, NO EARNINGS YET)
            INSERT INTO translator_monthly_stats (translator_id, month_date, vip_reads, total_earnings)
            VALUES (chapter_translator, current_month, 1, 0) 
            ON CONFLICT (translator_id, month_date)
            DO UPDATE SET
                vip_reads = translator_monthly_stats.vip_reads + 1,
                -- We DO NOT update total_earnings here anymore. It stays as is until distribution.
                updated_at = NOW();

            -- We also DO NOT update the lifetime 'total_earnings' or 'current_balance' yet.
            -- That happens only when the pool is distributed.
            
            -- However, we still might want to update 'vip_reads' in lifetime stats
            UPDATE translator_stats
            SET vip_reads = vip_reads + 1
            WHERE translator_id = chapter_translator;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Create Distribution Function (The Magic) 🪄
-- Admin calls this function after inputting the revenue for the month
CREATE OR REPLACE FUNCTION distribute_monthly_royalties(
    target_month DATE, 
    input_revenue NUMERIC
)
RETURNS VOID AS $$
DECLARE
    pool_size NUMERIC;
    total_reads INTEGER;
    calculated_rate NUMERIC;
BEGIN
    -- A. Calculate Pool Size (30% of Revenue)
    pool_size := input_revenue * 0.30;
    
    -- B. Get Total VIP Reads for that month from all translators
    SELECT COALESCE(SUM(vip_reads), 0) INTO total_reads
    FROM translator_monthly_stats
    WHERE month_date = target_month;

    IF total_reads = 0 THEN
        RAISE EXCEPTION 'No VIP reads found for this month used to distribute.';
    END IF;

    -- C. Calculate Rate per Read
    calculated_rate := pool_size / total_reads;

    -- D. Record the Pool Info
    INSERT INTO finance_monthly_pools (month_date, total_revenue, translator_pool_amount, total_vip_reads, rate_per_read, is_distributed)
    VALUES (target_month, input_revenue, pool_size, total_reads, calculated_rate, TRUE)
    ON CONFLICT (month_date) DO UPDATE SET
        total_revenue = input_revenue,
        translator_pool_amount = pool_size,
        total_vip_reads = total_reads,
        rate_per_read = calculated_rate,
        is_distributed = TRUE,
        updated_at = NOW();

    -- E. Distribute to Translators
    -- update translator_monthly_stats with the earnings
    UPDATE translator_monthly_stats
    SET total_earnings = vip_reads * calculated_rate
    WHERE month_date = target_month;

    -- F. Update Lifetime Balances (Real Money into Wallet)
    -- We join with the updated monthly stats to add the earnings to the user's balance
    UPDATE translator_stats ts
    SET 
        total_earnings = total_earnings + (tms.vip_reads * calculated_rate),
        current_balance = current_balance + (tms.vip_reads * calculated_rate)
    FROM translator_monthly_stats tms
    WHERE ts.translator_id = tms.translator_id
    AND tms.month_date = target_month;

    RAISE NOTICE '✅ Distribution Complete! Rate: % MNT/Read', calculated_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable RLS or permissions if needed (skipped for now as functions are security definer)
